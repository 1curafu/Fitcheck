import type { UiOccasion } from "./types";

export type Weather = { tempC: number; rain: boolean };

// v2 UI occasions → formality bands (Decision D9, widened — see below).
//
// An occasion is CONTEXT, not a dress code. "Evening" covers both a casual date
// and a black-tie dinner; "Work" covers both a creative studio in sneakers and a
// boardroom. What separates them is the user's dress code, which onboarding
// already collects (profiles.formality_min/max) and personalBand() applies.
// Narrow per-occasion bands used to encode one assumed dress code for everyone,
// which left a smart-casual wardrobe unable to produce a Work or Evening outfit
// at all. Every band now includes 3 (smart casual) — a legitimate answer anywhere.
const BANDS: Record<UiOccasion, [number, number]> = {
  everyday: [1.5, 3],
  work: [2, 4.5],
  weekend: [1, 3.5],
  evening: [2.5, 5],
};

export function occasionBand(o: UiOccasion): [number, number] {
  return BANDS[o];
}

export type DressCodeRange = {
  formality_min?: number | null;
  formality_max?: number | null;
};

/**
 * The occasion band narrowed to the dress codes the user picked in onboarding
 * (`profiles.formality_min/max`, derived from `dress_codes`).
 *
 * This is the answer the quiz already collects and the generator previously
 * ignored: someone who said "Smart casual" was still asked for 3.5–5 on Evening
 * and got nothing. Padded by ±0.5 so a single dress code isn't a knife-edge, and
 * falls back to the plain occasion band when there's no overlap at all (e.g. a
 * black-tie-only wardrobe asking for Everyday) — better a slightly-off outfit
 * than none.
 */
export function personalBand(
  o: UiOccasion,
  profile?: DressCodeRange | null,
): [number, number] {
  const [olo, ohi] = occasionBand(o);
  const min = profile?.formality_min;
  const max = profile?.formality_max;
  if (min == null || max == null) return [olo, ohi];

  const lo = Math.max(olo, Math.max(1, min - 0.5));
  const hi = Math.min(ohi, Math.min(5, max + 0.5));
  return lo > hi ? [olo, ohi] : [lo, hi];
}

/**
 * An explicit Refine formality (1..5) REPLACES the band with that level ±1.
 *
 * It replaces rather than intersects because Refine is an explicit instruction:
 * previously it was capped at the occasion's ceiling, so a smart-casual profile
 * could never ask for a black-tie outfit no matter what it selected.
 */
export function applyFormalityOverride(
  band: [number, number],
  f: number | null,
): [number, number] {
  if (f == null) return band;
  return [Math.max(1, f - 1), Math.min(5, f + 1)];
}

export function weatherRules(w: Weather) {
  return {
    needsOuterwear: w.tempC < 15,
    excludeMaterials: w.rain ? ["suede", "canvas"] : [],
  };
}
