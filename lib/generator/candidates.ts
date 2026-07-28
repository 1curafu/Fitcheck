import { weatherRules, type Weather } from "./rules";
import { inSeason } from "./season";

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
  // Season is deliberately NOT filtered here — see ./season.ts. It orders the
  // lists below and weights the score instead. Filtering ran against every
  // required slot, so one narrowly-tagged category zeroed the whole result:
  // measured on a wearable 10-top/4-bottom/4-shoe closet whose trousers merely
  // lacked a Winter tag, the same wardrobe gave 40 combos in summer and 0 in
  // winter.
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

  // Season ORDERS, it does not exclude. This matters because the CAP below
  // truncates the combo list: with a large off-season closet, the good combos
  // could otherwise fall past the cap and never reach scoring at all. The
  // breadth-first walk indexes outerwear and accessories modulo their list
  // length, so ordering in-season-first also means the earliest passes reach
  // the seasonally right coat and accessory.
  const bySeasonFirst = (list: CandidateItem[]) =>
    [...list].sort(
      (x, y) => Number(inSeason(y.seasons, a.season)) - Number(inSeason(x.seasons, a.season)),
    );

  const byCat = (c: string) => bySeasonFirst(eligible.filter((i) => i.category === c));
  const tops = byCat("Tops");
  const bottoms = byCat("Bottoms");
  const shoes = byCat("Shoes");
  const outer = byCat("Outerwear");
  const accessories = byCat("Accessories");

  // A combo needs all three required slots; without one there is nothing to build.
  if (!tops.length || !bottoms.length || !shoes.length) return [];

  const combos: CandidateItem[][] = [];

  // BREADTH-FIRST, not a nested product.
  //
  // This used to be three nested loops followed by `.slice(0, CAP)`. Because the
  // loops were top-major, every combination of the FIRST top was generated
  // before the second top was reached — so the cap was spent inside one top. A
  // closet with 20 of each category reached 1 top and 5 bottoms out of 20, which
  // is both reported symptoms at once: most of the wardrobe invisible to
  // ranking, and every look sharing a garment because there was only one to
  // share. Small closets stayed under the cap, which is why tests never saw it.
  //
  // Each pass `d` walks all tops once, pairing each with a different bottom and
  // shoe, so pass 0 alone touches every top, bottom and shoe. Later passes add
  // fresh pairings rather than exhausting one corner of the space. The offsets
  // are coprime-ish (d and 2d) so pairings do not repeat early.
  const passes = Math.max(bottoms.length, shoes.length);

  build: for (let d = 0; d < passes; d++) {
    for (let t = 0; t < tops.length; t++) {
      const b = bottoms[(t + d) % bottoms.length];
      const s = shoes[(t + d * 2) % shoes.length];

      // Outerwear is a PREFERENCE, not a requirement: layer it in when the cold
      // calls for it and the closet has one, but never refuse to dress someone
      // who owns no coat — that silently killed every outfit below 15°.
      // The weather strip's "Later" advice is what tells them to take a layer.
      // The index rotates too: it was pinned to [0], so one coat was worn on
      // every cold day and every other coat was unreachable.
      const base =
        needsOuterwear && outer.length
          ? [tops[t], b, s, outer[(t + d) % outer.length]]
          : [tops[t], b, s];

      combos.push(base); // required base (± outerwear), no accessory
      if (combos.length >= CAP) break build;

      if (a.maxAccessories > 0 && accessories.length) {
        combos.push([...base, accessories[(t + d) % accessories.length]]); // optional, capped accent
        if (combos.length >= CAP) break build;
      }
    }
  }

  // Colour is deliberately NOT filtered here. The Refine palette is a lean, and
  // leans are expressed by ranking (`scoreCombo`'s lean term), not by exclusion —
  // the same soft-preference model outerwear moved to above.
  return combos;
}
