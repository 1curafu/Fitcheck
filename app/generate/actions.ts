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
  mustColors: string[];
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
      mustColors: input.mustColors,
      maxAccessories: 1,
    };
    const combos = buildCandidates(candItems, candidateArgs);
    if (combos.length === 0) {
      return { status: "empty", weather, missing: missingCategory(candItems, candidateArgs) };
    }

    const aesthetic = profile?.archetype ? [profile.archetype] : [];
    const top = rankTopN(combos, { aesthetic, band }, 20);

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
