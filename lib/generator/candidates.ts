import { weatherRules, type Weather } from "./rules";

export type CandidateItem = {
  id: string;
  category: string; // DB TitleCase: Tops/Bottoms/Outerwear/Shoes/Accessories/Fragrance
  colors: string[];
  formality: number | null;
  seasons: string[];
  material: string | null;
};

export type CandidateArgs = {
  band: [number, number];
  weather: Weather;
  season: string;
  excludeItemIds: string[];
  maxAccessories: number;
};

const CAP = 200;

/** The required slots — a combo cannot exist without one of each. */
export const REQUIRED_CATEGORIES = ["Tops", "Bottoms", "Shoes"] as const;
export type RequiredCategory = (typeof REQUIRED_CATEGORIES)[number];

/**
 * How far BELOW a band's floor an item may still qualify.
 *
 * Footwear gets a wider stretch than everything else because formality is a
 * poor fit for shoes: a clean minimal leather sneaker is genuinely valid
 * smart-casual work wear, so an f=2 sneaker should reach Work [3, 4.5]. The
 * stretch is deliberately one step, not unlimited — it lets sneakers into Work
 * but NOT into Evening [3.5, 5], and never lets an f=1 shoe into Work.
 */
function floorTolerance(category: string): number {
  return category === "Shoes" ? 1 : 0.5;
}

function isEligible(i: CandidateItem, a: CandidateArgs, excludeMaterials: string[]): boolean {
  const [lo, hi] = a.band;
  if (i.category === "Fragrance") return false; // D11: fragrances are never slotted
  if (a.excludeItemIds.includes(i.id)) return false;
  if (i.material && excludeMaterials.includes(i.material.toLowerCase())) return false;
  if (i.seasons.length && !i.seasons.includes(a.season)) return false;
  const f = i.formality ?? 3;
  return f >= lo - floorTolerance(i.category) && f <= hi + 0.5;
}

/** Per-category counts of what survived filtering — lets an empty result explain itself. */
export function eligibility(items: CandidateItem[], a: CandidateArgs): Record<string, number> {
  const { excludeMaterials } = weatherRules(a.weather);
  const counts: Record<string, number> = {};
  for (const i of items) {
    if (!isEligible(i, a, excludeMaterials)) continue;
    counts[i.category] = (counts[i.category] ?? 0) + 1;
  }
  for (const c of REQUIRED_CATEGORIES) counts[c] ??= 0;
  counts.Outerwear ??= 0;
  return counts;
}

/**
 * Which required slot came up empty, or null if the closet can dress this band.
 * The screen uses this to say WHICH gap blocked the outfit instead of a generic
 * "add more pieces". Outerwear is never a reason — it does not block (see below).
 */
export function missingCategory(items: CandidateItem[], a: CandidateArgs): RequiredCategory | null {
  const counts = eligibility(items, a);
  return REQUIRED_CATEGORIES.find((c) => counts[c] === 0) ?? null;
}

export function buildCandidates(items: CandidateItem[], a: CandidateArgs): CandidateItem[][] {
  const { needsOuterwear, excludeMaterials } = weatherRules(a.weather);

  const eligible = items.filter((i) => isEligible(i, a, excludeMaterials));

  const byCat = (c: string) => eligible.filter((i) => i.category === c);
  const tops = byCat("Tops");
  const bottoms = byCat("Bottoms");
  const shoes = byCat("Shoes");
  const outer = byCat("Outerwear");
  const accessories = byCat("Accessories");

  const combos: CandidateItem[][] = [];
  for (const t of tops)
    for (const b of bottoms)
      for (const s of shoes) {
        // Outerwear is a PREFERENCE, not a requirement: layer it in when the cold
        // calls for it and the closet has one, but never refuse to dress someone
        // who owns no coat — that silently killed every outfit below 15°.
        // The weather strip's "Later" advice is what tells them to take a layer.
        const base = needsOuterwear && outer.length ? [t, b, s, outer[0]] : [t, b, s];
        combos.push(base); // required base (± outerwear), no accessory
        if (a.maxAccessories > 0 && accessories.length) {
          combos.push([...base, accessories[0]]); // optional, capped accent
        }
      }

  // Colour is deliberately NOT filtered here. The Refine palette is a lean, and
  // leans are expressed by ranking (`scoreCombo`'s lean term), not by exclusion —
  // the same soft-preference model outerwear moved to above.
  return combos.slice(0, CAP);
}
