import type { UiOccasion } from "./types";

export type Weather = { tempC: number; rain: boolean };

// v2 UI occasions → formality bands (Decision D9).
const BANDS: Record<UiOccasion, [number, number]> = {
  everyday: [1.5, 3],
  work: [3, 4.5],
  weekend: [1.5, 3.5],
  evening: [3.5, 5],
};

export function occasionBand(o: UiOccasion): [number, number] {
  return BANDS[o];
}

/** An explicit Refine formality (1..5) narrows the band toward that level (±1). */
export function applyFormalityOverride(
  band: [number, number],
  f: number | null,
): [number, number] {
  if (f == null) return band;
  return [Math.min(band[0], Math.max(1, f - 1)), Math.min(band[1], Math.min(5, f + 1))];
}

export function weatherRules(w: Weather) {
  return {
    needsOuterwear: w.tempC < 15,
    excludeMaterials: w.rain ? ["suede", "canvas"] : [],
  };
}
