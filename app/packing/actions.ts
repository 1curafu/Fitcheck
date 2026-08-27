"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentEntitlements, recordGeneration } from "@/lib/billing/entitlements";
import { fetchTripForecast } from "@/lib/weather/trip";
import { solveCapsule, QUALITY_FLOOR, type CapsuleItem } from "@/lib/packing/capsule";
import { scheduleDays } from "@/lib/packing/schedule";
import { expandDays, realBuilder } from "@/lib/packing/plan";
import { narrateTrip } from "@/lib/packing/narrate";
import { saveTrip, loadTrip, replaceCapsule, saveTripLooks } from "@/lib/packing/store";
import { PackingLockedError } from "@/lib/packing/errors";
import type { CandidateItem } from "@/lib/generator/candidates";

export type PlanTripInput = {
  destinationLabel: string;
  lat: number;
  lon: number;
  timezone: string;
  startDate: string;
  endDate: string;
  occasionMix: Record<string, number>;
  rewearLevel: number;
};

/** The ledger is keyed by local day, as the daily drop is. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Plan a trip: solve the capsule, schedule the days, name them, persist.
 *
 * ⚠️ **Gated BEFORE anything is spent.** The entitlement is checked ahead of the
 * forecast fetch, the solve and the model call — the same reasoning as
 * `uploadAndTag`, which gates before the storage writes rather than after. A
 * limit checked at the end has already paid for the thing it refuses.
 */
export async function planTrip(input: PlanTripInput): Promise<{ tripId: string }> {
  const { supabase, user } = await requireUser();

  const entitlements = await currentEntitlements();
  if (!entitlements.packingMode) throw new PackingLockedError();

  const days = expandDays(input.startDate, input.endDate, input.occasionMix);
  if (days.length === 0) throw new Error("That date range has no days in it");

  const { data: closet } = await supabase
    .from("items")
    .select("id, name, subcategory, category, colors, formality, seasons, material, texture, pattern")
    .eq("archived", false);
  const items = (closet ?? []) as unknown as CandidateItem[];

  const forecast = await fetchTripForecast(
    input.lat,
    input.lon,
    days.map((d) => d.date),
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("archetype, rain_guard")
    .eq("id", user.id)
    .maybeSingle();
  const aesthetic = profile?.archetype ? [profile.archetype as string] : [];

  const tripId = await solveAndPersist({
    userId: user.id,
    input,
    items,
    days,
    forecast,
    aesthetic,
    rainGuard: profile?.rain_guard ?? undefined,
  });

  // Recorded, NOT limited (spec decision #5). Packing is Pro-only and Pro is
  // sold on unlimited daily looks; metering it would contradict the pitch. But
  // a trip that writes nothing to the ledger is invisible when someone asks
  // what a user actually costs.
  // ⚠️ Recorded, NOT limited (spec decision #5). The "occasion" slot carries
  // the trip's start date, since a trip has no single occasion — the mix is on
  // the trip row.
  await recordGeneration(user.id, `trip:${input.startDate}`, todayIso(), "trip");

  revalidatePath("/packing");
  return { tripId };
}

type SolveArgs = {
  userId: string;
  input: PlanTripInput;
  items: CandidateItem[];
  days: ReturnType<typeof expandDays>;
  forecast: Awaited<ReturnType<typeof fetchTripForecast>>;
  aesthetic: string[];
  rainGuard?: boolean;
  pinned?: string[];
  excluded?: string[];
  tripId?: string;
};

/** The shared path: solve → schedule → narrate → persist. Used by both plan and edit. */
async function solveAndPersist(args: SolveArgs): Promise<string> {
  const build = realBuilder(args.items, (date) => args.forecast.byDate[date], {
    aesthetic: args.aesthetic,
    rainGuard: args.rainGuard,
  });

  const capsuleItems: CapsuleItem[] = args.items.map((i) => ({ id: i.id, category: i.category }));
  const solved = solveCapsule({
    closet: capsuleItems,
    days: args.days,
    level: args.input.rewearLevel,
    floor: QUALITY_FLOOR,
    build,
    pinned: args.pinned,
    excluded: args.excluded,
  });

  const scheduled = scheduleDays(solved);
  const byId = new Map(args.items.map((i) => [i.id, i]));
  // `describeCombos` reads these fields to write an accurate sentence — the
  // model saw none of them until 2026-08-15 and invented fabric from a
  // subcategory name.
  const describe = (ids: string[]) =>
    ids.flatMap((id) => {
      const it = byId.get(id) as (CandidateItem & { name?: string | null; subcategory?: string | null }) | undefined;
      return it
        ? [{
            category: it.category,
            subcategory: it.subcategory ?? null,
            colors: it.colors,
            material: it.material,
            texture: it.texture,
            pattern: it.pattern,
          }]
        : [];
    });

  const narration = await narrateTrip({
    days: scheduled.map((d) => ({
      occasion: d.day.occasion,
      tempC: args.forecast.byDate[d.day.date]?.tempC ?? 15,
      rain: args.forecast.byDate[d.day.date]?.rain ?? false,
      pieces: describe(d.itemIds),
    })),
    capsule: describe(solved.itemIds),
    aesthetic: args.aesthetic,
    destination: args.input.destinationLabel,
    beyondHorizon: args.forecast.beyondHorizon,
  });

  const pinnedSet = new Set(args.pinned ?? []);
  const capsule = solved.itemIds.map((itemId) => ({ itemId, pinned: pinnedSet.has(itemId) }));

  const tripId =
    args.tripId ??
    (await saveTrip(
      args.userId,
      {
        destinationLabel: args.input.destinationLabel,
        lat: args.input.lat,
        lon: args.input.lon,
        timezone: args.input.timezone,
        startDate: args.input.startDate,
        endDate: args.input.endDate,
        occasionMix: args.input.occasionMix,
        rewearLevel: args.input.rewearLevel,
      },
      capsule,
    ));

  if (args.tripId) await replaceCapsule(tripId, capsule);
  await saveTripLooks(args.userId, tripId, scheduled, narration.days);

  return tripId;
}

/**
 * Pin or remove a piece, then re-solve.
 *
 * ⚠️ **Editing is the same solve with constraints** — the engine already takes
 * `pinned` and `excluded`, which is why they shipped unused. A removal that
 * leaves days uncovered comes back in the view so the screen can say
 * "removing this leaves Wed and Fri uncovered" rather than silently shrinking.
 */
export async function editCapsule(
  tripId: string,
  edit: { pin?: string; remove?: string; swapFor?: string },
): Promise<{ tripId: string }> {
  const { supabase, user } = await requireUser();

  const entitlements = await currentEntitlements();
  if (!entitlements.packingMode) throw new PackingLockedError();

  const trip = await loadTrip(tripId);
  if (!trip) throw new Error("That trip no longer exists");

  const pinned = new Set(trip.capsule.filter((c) => c.pinned).map((c) => c.itemId));
  if (edit.pin) pinned.add(edit.pin);
  if (edit.remove) pinned.delete(edit.remove);

  /**
   * A swap is a pin and a removal in one move, and it has to be BOTH.
   *
   * ⚠️ Removing alone re-solves and the solve is free to pick the same piece
   * straight back — it was chosen because it scored best, and nothing about
   * excluding it changes that for the replacement. Pinning the replacement is
   * what makes "use this instead" actually mean instead.
   */
  if (edit.swapFor) pinned.add(edit.swapFor);

  const { data: closet } = await supabase
    .from("items")
    .select("id, name, subcategory, category, colors, formality, seasons, material, texture, pattern")
    .eq("archived", false);
  const items = (closet ?? []) as unknown as CandidateItem[];

  const days = expandDays(trip.startDate, trip.endDate, trip.occasionMix);
  const forecast = await fetchTripForecast(trip.lat, trip.lon, days.map((d) => d.date));

  const { data: profile } = await supabase
    .from("profiles")
    .select("archetype, rain_guard")
    .eq("id", user.id)
    .maybeSingle();

  await solveAndPersist({
    userId: user.id,
    tripId,
    input: {
      destinationLabel: trip.destinationLabel,
      lat: trip.lat,
      lon: trip.lon,
      timezone: trip.timezone,
      startDate: trip.startDate,
      endDate: trip.endDate,
      occasionMix: trip.occasionMix,
      rewearLevel: trip.rewearLevel,
    },
    items,
    days,
    forecast,
    aesthetic: profile?.archetype ? [profile.archetype as string] : [],
    rainGuard: profile?.rain_guard ?? undefined,
    pinned: [...pinned],
    excluded: edit.remove ? [edit.remove] : undefined,
  });

  // An edit re-runs the model, so it is a real generation and is recorded.
  await recordGeneration(user.id, `trip:${trip.startDate}`, todayIso(), "trip");
  revalidatePath(`/packing/${tripId}`);
  return { tripId };
}
