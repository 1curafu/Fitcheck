import { createClient } from "@/lib/supabase/server";
import type { ScheduledDay } from "./schedule";

export type CapsuleEntry = { itemId: string; pinned: boolean };

export type StoredTrip = {
  id: string;
  destinationLabel: string;
  lat: number;
  lon: number;
  timezone: string;
  startDate: string;
  endDate: string;
  occasionMix: Record<string, number>;
  rewearLevel: number;
  capsule: CapsuleEntry[];
};

type TripRow = {
  id: string;
  destination_label: string;
  lat: number;
  lon: number;
  timezone: string;
  start_date: string;
  end_date: string;
  occasion_mix: unknown;
  rewear_level: number;
};

/**
 * Row → domain. Pure, so the mapping is unit-tested without a database.
 *
 * `occasion_mix` is jsonb, so it arrives as `unknown` and is coerced defensively:
 * a malformed value yields an empty mix (which `expandDays` pads) rather than
 * throwing halfway through rendering a trip the user has already planned.
 */
export function toStoredTrip(row: TripRow, capsule: CapsuleEntry[]): StoredTrip {
  const mix: Record<string, number> = {};
  if (row.occasion_mix && typeof row.occasion_mix === "object") {
    for (const [k, v] of Object.entries(row.occasion_mix as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) mix[k] = Math.floor(v);
    }
  }
  return {
    id: row.id,
    destinationLabel: row.destination_label,
    lat: row.lat,
    lon: row.lon,
    timezone: row.timezone,
    startDate: row.start_date,
    endDate: row.end_date,
    occasionMix: mix,
    rewearLevel: row.rewear_level,
    capsule,
  };
}

export async function saveTrip(
  userId: string,
  spec: Omit<StoredTrip, "id" | "capsule">,
  capsule: CapsuleEntry[],
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      destination_label: spec.destinationLabel,
      lat: spec.lat,
      lon: spec.lon,
      timezone: spec.timezone,
      start_date: spec.startDate,
      end_date: spec.endDate,
      occasion_mix: spec.occasionMix,
      rewear_level: spec.rewearLevel,
    })
    .select("id")
    .single();
  // ⚠️ Every error is checked. A seed that failed silently once left /stats
  // rendering a MOST WORN header with nothing under it, and every assertion
  // downstream was vacuous while CI read green.
  if (error || !data) throw new Error(`saving the trip failed: ${error?.message}`);

  await replaceCapsule(data.id, capsule);
  return data.id;
}

/** Delete-then-insert. A re-solve may return a different set, and leftovers must not survive. */
export async function replaceCapsule(tripId: string, capsule: CapsuleEntry[]): Promise<void> {
  const supabase = await createClient();

  const { error: delError } = await supabase.from("trip_items").delete().eq("trip_id", tripId);
  if (delError) throw new Error(`clearing the capsule failed: ${delError.message}`);
  if (capsule.length === 0) return;

  const { error } = await supabase.from("trip_items").insert(
    capsule.map((c) => ({ trip_id: tripId, item_id: c.itemId, pinned: c.pinned })),
  );
  if (error) throw new Error(`saving the capsule failed: ${error.message}`);
}

export async function loadTrip(tripId: string): Promise<StoredTrip | null> {
  const supabase = await createClient();

  // RLS scopes both reads to the caller, so no user_id filter is needed here —
  // and adding one would imply the policy is not trusted.
  const { data: row } = await supabase
    .from("trips")
    .select("id, destination_label, lat, lon, timezone, start_date, end_date, occasion_mix, rewear_level")
    .eq("id", tripId)
    .maybeSingle();
  if (!row) return null;

  const { data: items } = await supabase
    .from("trip_items")
    .select("item_id, pinned")
    .eq("trip_id", tripId);

  return toStoredTrip(
    row as TripRow,
    (items ?? []).map((i) => ({ itemId: i.item_id, pinned: i.pinned })),
  );
}

export type TripLook = { name: string; why: string };

/**
 * Persist the per-day looks.
 *
 * ⚠️ **Delete-then-insert, not upsert** — the same rule as `saveDailyLooks`. A
 * re-solve may return a different number of days, and leftovers must not
 * survive alongside the new set.
 *
 * ⚠️ **Scoped to `trip_id`**, so it can never touch the daily drop's rows.
 */
export async function saveTripLooks(
  userId: string,
  tripId: string,
  days: ScheduledDay[],
  looks: TripLook[],
): Promise<void> {
  const supabase = await createClient();

  const { error: delError } = await supabase.from("outfits").delete().eq("trip_id", tripId);
  if (delError) throw new Error(`clearing trip looks failed: ${delError.message}`);
  if (days.length === 0) return;

  const { data: inserted, error } = await supabase
    .from("outfits")
    .insert(
      days.map((d, i) => ({
        user_id: userId,
        trip_id: tripId,
        trip_day: d.day.date,
        occasion: d.day.occasion,
        look_name: looks[i]?.name ?? "Look",
        ai_reasoning: looks[i]?.why ?? "",
      })),
    )
    .select("id");
  if (error || !inserted) throw new Error(`saving trip looks failed: ${error?.message}`);

  const pieces = days.flatMap((d, i) =>
    d.itemIds.map((itemId) => ({
      outfit_id: inserted[i].id,
      item_id: itemId,
      // ⚠️ `slot` is NOT NULL. Omitting it made an insert fail SILENTLY once,
      // leaving /stats with a header and nothing under it.
      slot: "piece",
    })),
  );
  if (pieces.length === 0) return;

  const { error: pieceError } = await supabase.from("outfit_items").insert(pieces);
  if (pieceError) throw new Error(`saving trip look pieces failed: ${pieceError.message}`);
}

export type TripSummary = {
  id: string;
  destinationLabel: string;
  startDate: string;
  endDate: string;
  pieceCount: number;
  dayCount: number;
};

/**
 * Every trip the caller owns, most recent first.
 *
 * ⚠️ **This is the half of "a trip is a real entity" that was missing.** The
 * rows were being written from day one — destination, dates, capsule, per-day
 * looks — and nothing ever read them back, so a saved trip was invisible the
 * moment the page closed. Persistence nobody can reach is indistinguishable
 * from no persistence, and that is exactly how it looked.
 */
export async function listTrips(): Promise<TripSummary[]> {
  const supabase = await createClient();

  // RLS scopes this to the caller; a user_id filter would imply otherwise.
  const { data, error } = await supabase
    .from("trips")
    .select("id, destination_label, start_date, end_date, trip_items(count)")
    .order("start_date", { ascending: false });
  if (error) throw new Error(`listing trips failed: ${error.message}`);

  return (data ?? []).map((t) => ({
    id: t.id as string,
    destinationLabel: t.destination_label as string,
    startDate: t.start_date as string,
    endDate: t.end_date as string,
    // PostgREST returns an aggregate as a one-element array.
    pieceCount: (t.trip_items as unknown as { count: number }[])?.[0]?.count ?? 0,
    dayCount: daysInclusive(t.start_date as string, t.end_date as string),
  }));
}

/** Inclusive whole days. Calendar strings, never instants — DST is not a factor. */
export function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}
