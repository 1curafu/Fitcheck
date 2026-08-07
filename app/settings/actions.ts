"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PreferencesSchema, readPreferences } from "@/lib/profile/preferences";
import { fetchForecast } from "@/lib/weather/open-meteo";
import { locationColumns, locationMoved, resolveLocation } from "@/lib/weather/location";
import { localDateFor } from "@/lib/outfits/local-date";

/**
 * Persist a partial preferences patch.
 *
 * Merge-patch, not replace: two settings screens open at once must not have the
 * last save silently revert the other's toggle.
 *
 * Validation uses the STRICT schema — a bad value is rejected here rather than
 * repaired on every later read.
 */
export async function updatePreferences(patch: unknown): Promise<void> {
  const data = PreferencesSchema.partial().parse(patch);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: row } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const next = { ...readPreferences(row?.preferences), ...data };

  const { error } = await supabase.from("profiles").update({ preferences: next }).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  // The stylist screen reads both preferences: rain guard reaches weatherRules,
  // tempUnit reaches the weather strip.
  revalidatePath("/generate");
}

const PickedCitySchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z.string().min(1).max(80),
});

/**
 * Set the user's location from Settings.
 *
 * WHY THIS EXISTS SEPARATELY FROM `saveLocation`: that one runs inside the
 * Stylist's `applyResult`, where the timezone is already in hand from the
 * generate that just happened. Settings has no generate — and location cannot be
 * written without a timezone, because `localDateFor` and `predictDefaultOccasion`
 * read `location_timezone` and a null falls back to UTC, which is exactly the
 * failure Decision 5 exists to prevent (a UTC key rolls the daily drop over
 * mid-evening). So this resolves one first. That is one Open-Meteo call, no API
 * key, no AI, and `fetchForecast` already caches it 30 minutes per rounded
 * coordinate.
 *
 * A picked city is always `source: "city"` — `resolveLocation` surfaces that as
 * the origin, and it is what suppresses the Stylist's silent GPS refresh so a
 * deliberate choice is not overwritten on the next load.
 */
export async function setLocation(input: unknown): Promise<void> {
  const picked = PickedCitySchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("location_lat, location_lon, location_label, location_source, location_timezone")
    .eq("id", user.id)
    .single();

  // Resolve the timezone BEFORE writing anything. If this throws, the old
  // location survives — better than storing one with a null timezone.
  const forecast = await fetchForecast(picked.lat, picked.lon);

  // The SAME predicate the Stylist path uses, against the RESOLVED previous
  // location. Two doors to one setting must agree on what counts as a move, and
  // resolving means the first move away from DEFAULT_LOCATION counts even
  // though nothing is stored yet.
  const moved = locationMoved(picked, resolveLocation({ profile }));

  const { error } = await supabase
    .from("profiles")
    .update(
      locationColumns(
        { ...picked, source: "city", timezone: forecast.timezone },
        new Date().toISOString(),
      ),
    )
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  if (moved) await clearTodaysDrop(supabase, user.id, forecast.timezone);

  revalidatePath("/settings");
  revalidatePath("/generate");
}

/**
 * Today's looks were composed for the OLD city's weather, so a move invalidates
 * them. Decision 5 caches the drop; it does not make it correct for a different
 * climate — without this you land in Reykjavik and see outfits built for 26°C
 * Manila rain under a strip reading 12°C overcast.
 *
 * The rebuild is FREE, and that is not incidental: `generation_events` records
 * `kind` by whether a stored set already exists, so deleting the set is exactly
 * what makes the next call a `drop`. MONETISATION §2 — drops are never metered,
 * on any tier. The user changed a setting; they did not ask for a reroll.
 *
 * ⚠️ Keyed on the NEW timezone. Crossing zones can change what "today" is, and
 * deleting under the old key would destroy a past day's history while leaving
 * the row that is actually stale untouched — both intentions inverted.
 */
async function clearTodaysDrop(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  timezone: string,
): Promise<void> {
  const today = localDateFor(new Date(), timezone);

  // Styled looks carry a weather snapshot too, and are cached per
  // (user, item, local day) — a look styled for Manila is as wrong as a drop is.
  const { data: rows } = await supabase
    .from("outfits")
    .select("id")
    .eq("user_id", userId)
    .eq("generated_on", today);

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return;

  await supabase.from("outfit_items").delete().in("outfit_id", ids);
  await supabase.from("outfits").delete().in("id", ids);
}
