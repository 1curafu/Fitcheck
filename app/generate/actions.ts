"use server";

import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { fetchForecast } from "@/lib/weather/open-meteo";
import { laterAdvice } from "@/lib/weather/advice";
import { personalBand, applyFormalityOverride } from "@/lib/generator/rules";
import { buildCandidates, missingCategory, type CandidateItem } from "@/lib/generator/candidates";
import { rankTopN } from "@/lib/generator/rank";
import { rerank } from "@/lib/generator/rerank";
import { layoutForLook, staggerOrder } from "@/lib/generator/layout";
import { localDateFor } from "@/lib/outfits/local-date";
import { loadDailyLooks, saveDailyLooks } from "@/lib/outfits/daily";
import { reassembleLooks } from "@/lib/outfits/reassemble";
import { assertCanGenerate } from "@/lib/outfits/quota";
import { predictOccasion, defaultReason } from "@/lib/outfits/predict-occasion";
import { recordOverride } from "@/lib/outfits/overrides";
import {
  resolveLocation,
  roundCoord,
  LocationInputSchema,
  type LocationSource,
} from "@/lib/weather/location";
import type {
  GenerateResult,
  Look,
  LookPiece,
  UiOccasion,
  WeatherPayload,
} from "@/lib/generator/types";

function currentSeason(d: Date): string {
  const m = d.getMonth();
  return m < 2 || m === 11 ? "Winter" : m < 5 ? "Spring" : m < 8 ? "Summer" : "Autumn";
}

export async function generate(input: {
  occasion: UiOccasion;
  formality: number | null;
  /** Refine "Lean into" colour families (`COLOR_FAMILIES` keys). A preference, not a filter. */
  lean: string[];
  /** Explicit user action only — the one way to spend an AI call on a day already answered. */
  regenerate?: boolean;
  city?: { lat: number; lon: number; label: string; source: LocationSource };
}): Promise<GenerateResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Not signed in" };

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "archetype, formality_min, formality_max, location_lat, location_lon, location_label, location_source",
      )
      .eq("id", user.id)
      .single();
    const { data: itemsRaw } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false);
    const items = itemsRaw ?? [];
    const byId = new Map(items.map((i) => [i.id, i]));

    const loc = resolveLocation({ input: input.city, profile });

    const now = new Date();
    const f = await fetchForecast(loc.lat, loc.lon);
    const advice = laterAdvice(f.hourly);
    const weather: WeatherPayload = {
      tempC: f.tempC,
      feelsLikeC: f.feelsLikeC,
      condition: f.condition,
      cityLabel: loc.label,
      timezone: f.timezone,
      locationOrigin: loc.origin,
      laterSentence: advice.sentence,
      adviceClause: advice.adviceClause,
      laterLabel: "Later",
      hourly: f.hourly,
    };

    const today = localDateFor(now, f.timezone);

    // The daily drop (Decision 5): today's looks are generated once and then
    // read back. Only an explicit regenerate spends an AI call on a day the
    // stylist has already answered.
    if (!input.regenerate) {
      const stored = await loadDailyLooks(user.id, input.occasion, today);
      if (stored?.length) {
        const paths = Array.from(
          new Set(
            stored
              .flatMap((s) => s.pieces.map((p) => byId.get(p.itemId)))
              .filter((it): it is NonNullable<typeof it> => Boolean(it))
              .map((it) => displayPath(it)),
          ),
        );
        const signed = await signItemImages(paths);
        const looks = reassembleLooks(stored, byId, signed, (id) => {
          const it = byId.get(id);
          return it ? displayPath(it) : undefined;
        });
        // null = the closet changed under the stored set; fall through and
        // regenerate rather than showing an outfit with a hole in it.
        if (looks) return { status: "ok", weather, looks };
      }
    }

    await assertCanGenerate(user.id);

    const candItems: CandidateItem[] = items.map((i) => ({
      id: i.id,
      category: i.category,
      colors: i.colors ?? [],
      formality: i.formality,
      seasons: i.seasons ?? [],
      material: i.material,
    }));
    // Occasion gives the context; the user's onboarding dress codes narrow it;
    // an explicit Refine formality overrides both.
    const band = applyFormalityOverride(
      personalBand(input.occasion, profile),
      input.formality,
    );
    const candidateArgs = {
      band,
      weather: { tempC: f.tempC, rain: f.hourly.some((h) => h.isNow && h.rain) },
      season: currentSeason(now),
      excludeItemIds: [],
      maxAccessories: 1,
    };
    const combos = buildCandidates(candItems, candidateArgs);
    if (combos.length === 0) {
      return { status: "empty", weather, missing: missingCategory(candItems, candidateArgs) };
    }

    const aesthetic = profile?.archetype ? [profile.archetype] : [];
    // The Refine colour pick lands here, in ranking — not in candidate building.
    // It reorders the shortlist toward the requested families and is dropped
    // silently when the closet cannot honour it.
    const top = rankTopN(combos, { aesthetic, band, lean: input.lean }, 20);

    const { picks } = await rerank({
      combos: top.map((t) =>
        t.items.map((ci) => {
          const it = byId.get(ci.id)!;
          return { category: it.category, subcategory: it.subcategory, colors: it.colors ?? [] };
        }),
      ),
      aesthetic,
      occasion: input.occasion,
      weatherLabel: f.condition,
      tempC: f.tempC,
    });

    const paths = Array.from(
      new Set(top.flatMap((t) => t.items.map((ci) => displayPath(byId.get(ci.id)!)))),
    );
    const signed = await signItemImages(paths);

    const looks: Look[] = picks.map((p) => {
      const combo = top[p.combo_index]?.items ?? top[0].items;
      const dbItems = combo.map((ci) => byId.get(ci.id)!);
      const slots = layoutForLook(dbItems.map((d) => ({ category: d.category })));
      const pieces: LookPiece[] = dbItems.map((d, idx) => ({
        itemId: d.id,
        category: d.category,
        subcategory: d.subcategory ?? null,
        brand: d.brand ?? null,
        name: d.name ?? null,
        colors: d.colors ?? [],
        cutoutUrl: signed.get(displayPath(d)) ?? "",
        slot: slots[idx],
      }));
      return { name: p.name, why: p.why, pieces, anchorIndex: staggerOrder(slots)[0] };
    });

    // Fire-and-forget would be simpler, but a failed write means the user pays
    // for another AI call on their next tap — worth awaiting.
    await saveDailyLooks(user.id, input.occasion, today, weather, looks);

    return { status: "ok", weather, looks };
  } catch (e) {
    console.error("[generate] failed:", e);
    return { status: "error", message: e instanceof Error ? e.message : "Generation failed" };
  }
}

/**
 * The single write path for a user's location. `generate` stays read-only.
 * Called by the client after a successful generate for a location the user
 * actually supplied (geolocation or city search) — never for the profile or
 * default fallback, where there is nothing new to write.
 */
export async function saveLocation(input: unknown): Promise<void> {
  const d = LocationInputSchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({
      location_lat: roundCoord(d.lat),
      location_lon: roundCoord(d.lon),
      location_label: d.label,
      location_source: d.source,
      location_timezone: d.timezone,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
}

/**
 * The seed for the morning. Cheap on purpose — one profile read, date math, NO
 * AI and NO weather — so the client can pick the right occasion before the first
 * generate without adding latency.
 */
export async function predictDefaultOccasion(): Promise<{ occasion: UiOccasion; reason: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { occasion: "everyday", reason: defaultReason("everyday") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("occasions, location_timezone")
    .eq("id", user.id)
    .single();

  const tz = profile?.location_timezone ?? "UTC";
  const occasion = predictOccasion(new Date(), tz, profile?.occasions ?? []);
  return { occasion, reason: defaultReason(occasion) };
}

/**
 * Record that the user chose an occasion other than the predicted default.
 * Fire-and-forget: the caller does not await the outcome, and a failure here
 * must never affect the looks. Guards `chosen === predicted` so a no-op tap is
 * not logged as an override.
 */
export async function logOccasionOverride(input: {
  predicted: UiOccasion;
  chosen: UiOccasion;
}): Promise<void> {
  if (input.chosen === input.predicted) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone")
    .eq("id", user.id)
    .single();

  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");
  await recordOverride(user.id, today, input.predicted, input.chosen);
}
