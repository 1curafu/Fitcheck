"use server";

import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { fetchForecast } from "@/lib/weather/open-meteo";
import { laterAdvice } from "@/lib/weather/advice";
import { readPreferences } from "@/lib/profile/preferences";
import { personalBand } from "@/lib/generator/rules";
import { buildCandidates, type CandidateItem } from "@/lib/generator/candidates";
import { rankTopN } from "@/lib/generator/rank";
import { currentSeason } from "@/lib/generator/season";
import { rerank } from "@/lib/generator/rerank";
import { layoutForLook, staggerOrder } from "@/lib/generator/layout";
import { localDateFor } from "@/lib/outfits/local-date";
import { assertCanGenerate, noteGeneration, QuotaExceededError } from "@/lib/outfits/quota";
import { predictOccasion } from "@/lib/outfits/predict-occasion";
import { pinItem, styledLookName, shortlistFor } from "@/lib/outfits/styled";
import { loadStyledLook, saveStyledLook } from "@/lib/outfits/styled-store";
import { resolveLocation } from "@/lib/weather/location";
import type { LookDraft, LookPiece, WeatherPayload } from "@/lib/generator/types";

export type StyleResult =
  | { status: "ok"; outfitId: string }
  // Carries the seam's own reason. Styling is a Pro capability rather than a
  // daily allowance, so a message written here ("back tomorrow") would be
  // actively false — tomorrow gives a free user no stylings either.
  | { status: "limited"; message: string }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

/**
 * "Style an outfit with this" (Fitcheck.dc.html:654).
 *
 * Pins the piece, runs the deterministic pipeline, spends ONE text call to name
 * and explain the result, then persists it keyed by (user, item, local day) so a
 * second tap the same day is a free read.
 *
 * This does not contradict Decision 5. That decision says never pay twice for a
 * question already answered — which is why the daily drop caches. "What goes
 * with this piece?" is a different question from "what should I wear today?",
 * so it gets its own answer, cached the same way.
 *
 * The alternative readings were measured and rejected; see the plan
 * `todo/2026-07-24-item-detail-rebuild.md`.
 */
export async function styleWithItem(itemId: string): Promise<StyleResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "error", message: "Not signed in" };

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "archetype, formality_min, formality_max, occasions, location_lat, location_lon, location_label, location_source, location_timezone, preferences",
      )
      .eq("id", user.id)
      .single();

    const { data: itemsRaw } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false);
    const items = itemsRaw ?? [];
    const subject = items.find((i) => i.id === itemId);
    if (!subject) return { status: "error", message: "Piece not found" };

    // Fragrance occupies no slot in a look, so there is nothing to build around.
    if (subject.category === "Fragrance") {
      return { status: "empty", message: "Fragrance finishes a look rather than forming one." };
    }

    const now = new Date();
    // The date key comes from the PROFILE timezone, not the forecast's, so the
    // cache can be checked without a network call — the same zone `toggleWear`
    // and `predictDefaultOccasion` use.
    const today = localDateFor(now, profile?.location_timezone ?? "UTC");

    // THE CACHE. Checked before the quota is touched and before any I/O beyond
    // this one indexed lookup — re-opening an answer you already have must never
    // cost anything.
    const cached = await loadStyledLook(user.id, itemId, today);
    if (cached) return { status: "ok", outfitId: cached };

    // Checked before the forecast fetch below: a free user is turned away
    // without us paying for I/O they will never see. The occasion is not needed
    // here — a styled look is a flat capability (Pro #2), not a counted meter —
    // and it is resolved a few lines down, in time for the ledger.
    try {
      await assertCanGenerate(user.id, { kind: "styled", today });
    } catch (e) {
      if (e instanceof QuotaExceededError) return { status: "limited", message: e.message };
      throw e;
    }

    const loc = resolveLocation({ profile });
    const f = await fetchForecast(loc.lat, loc.lon);
    const prefs = readPreferences(profile?.preferences);
    const advice = laterAdvice(f.hourly, prefs.tempUnit);
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
      tempUnit: prefs.tempUnit,
    };

    // The occasion the app already believes you are dressing for today — the CTA
    // has no picker, and a look styled for the wrong context is worse than one
    // that simply agrees with the rest of the day.
    const occasion = predictOccasion(now, f.timezone, profile?.occasions ?? []);

    /**
     * Pinning, done BEFORE candidate building rather than after.
     *
     * Dropping every rival in the subject's own category means any combo using
     * that category uses THIS piece. Filtering the built list instead would have
     * to survive the 200-combo CAP, and a piece that never made the cut would
     * silently produce "no looks" — the same class of bug as the coverage
     * defect fixed in PR #14.
     */
    const pool = items.filter((i) => i.category !== subject.category || i.id === itemId);
    const candItems: CandidateItem[] = pool.map((i) => ({
      id: i.id,
      colors: i.colors ?? [],
      category: i.category,
      formality: i.formality,
      seasons: i.seasons ?? [],
      material: i.material,
    }));

    const args = {
      weather: { tempC: f.tempC, rain: f.hourly.some((h) => h.isNow && h.rain) },
      season: currentSeason(now),
      excludeItemIds: [],
      maxAccessories: 1,
      rainGuard: prefs.rainGuard,
    };
    const aesthetic = profile?.archetype ? [profile.archetype] : [];

    // Try the day's own formality band first, then the full scale. A piece
    // dressier or more casual than today's context is still stylable — refusing
    // would be the "hard filter empties a required slot" trap again.
    let pinned: ReturnType<typeof rankTopN> = [];
    for (const band of [personalBand(occasion, profile), [1, 5] as [number, number]]) {
      const combos = buildCandidates(candItems, { ...args, band });
      const ranked = rankTopN(
        combos,
        { aesthetic, band, lean: [], recentlyShown: [], season: args.season },
        combos.length,
      );
      pinned = pinItem(ranked, itemId);
      if (pinned.length) break;
    }

    if (!pinned.length) {
      return {
        status: "empty",
        message: "Not enough other pieces to build a look around this one yet.",
      };
    }

    const byId = new Map(items.map((i) => [i.id, i]));
    // Diversified, exactly as the daily path does it. A raw slice hands the
    // model twenty variations of one idea, because ranking clusters.
    const shortlist = shortlistFor(pinned);

    const { picks } = await rerank({
      want: 1,
      combos: shortlist.map((t) =>
        t.items.map((ci) => {
          const it = byId.get(ci.id)!;
          return { category: it.category, subcategory: it.subcategory, colors: it.colors ?? [] };
        }),
      ),
      aesthetic,
      occasion,
      weatherLabel: f.condition,
      tempC: f.tempC,
    });

    const chosen = shortlist[picks[0]?.combo_index ?? 0] ?? shortlist[0];
    const dbItems = chosen.items.map((ci) => byId.get(ci.id)!);
    const paths = dbItems.map(displayPath);
    const signed = await signItemImages(paths);
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

    const draft: LookDraft = {
      name: picks[0]?.name || styledLookName(subject),
      why: picks[0]?.why ?? "",
      pieces,
      anchorIndex: staggerOrder(slots)[0],
    };

    const outfitId = await saveStyledLook(user.id, itemId, occasion, today, weather, draft);
    if (!outfitId) return { status: "error", message: "Couldn't save the look" };

    // After the model answered AND the write landed. The occasion is known by
    // now, which is why recording is separate from the gate above.
    await noteGeneration(user.id, { kind: "styled", occasion, today });

    return { status: "ok", outfitId };
  } catch (e) {
    console.error("[styleWithItem] failed:", e);
    return { status: "error", message: e instanceof Error ? e.message : "Couldn't style this" };
  }
}
