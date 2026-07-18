"use server";

import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { fetchForecast } from "@/lib/weather/open-meteo";
import { laterAdvice } from "@/lib/weather/advice";
import { occasionBand, applyFormalityOverride } from "@/lib/generator/rules";
import { buildCandidates, type CandidateItem } from "@/lib/generator/candidates";
import { rankTopN } from "@/lib/generator/rank";
import { rerank } from "@/lib/generator/rerank";
import { layoutForLook, staggerOrder } from "@/lib/generator/layout";
import type {
  GenerateResult,
  Look,
  LookPiece,
  UiOccasion,
  WeatherPayload,
} from "@/lib/generator/types";

const DEFAULT_LOCATION = { lat: 52.52, lon: 13.41, label: "Berlin" };

function currentSeason(d: Date): string {
  const m = d.getMonth();
  return m < 2 || m === 11 ? "Winter" : m < 5 ? "Spring" : m < 8 ? "Summer" : "Autumn";
}

export async function generate(input: {
  occasion: UiOccasion;
  formality: number | null;
  mustColors: string[];
  city?: { lat: number; lon: number; label: string };
}): Promise<GenerateResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Not signed in" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("archetype, location_lat, location_lon, location_label")
      .eq("id", user.id)
      .single();
    const { data: itemsRaw } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false);
    const items = itemsRaw ?? [];
    const byId = new Map(items.map((i) => [i.id, i]));

    const loc =
      input.city ??
      (profile?.location_lat != null
        ? {
            lat: profile.location_lat,
            lon: profile.location_lon as number,
            label: profile.location_label ?? "Current location",
          }
        : DEFAULT_LOCATION);

    const now = new Date();
    const f = await fetchForecast(loc.lat, loc.lon, now.toISOString().slice(0, 16));
    const advice = laterAdvice(f.hourly);
    const weather: WeatherPayload = {
      tempC: f.tempC,
      feelsLikeC: f.feelsLikeC,
      condition: f.condition,
      cityLabel: loc.label,
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
    const band = applyFormalityOverride(occasionBand(input.occasion), input.formality);
    const combos = buildCandidates(candItems, {
      band,
      weather: { tempC: f.tempC, rain: f.hourly.some((h) => h.isNow && h.rain) },
      season: currentSeason(now),
      excludeItemIds: [],
      mustColors: input.mustColors,
      maxAccessories: 1,
    });
    if (combos.length === 0) return { status: "empty", weather };

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
    return { status: "error", message: e instanceof Error ? e.message : "Generation failed" };
  }
}
