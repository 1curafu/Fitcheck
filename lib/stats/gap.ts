import {
  eligibleByCategory,
  REQUIRED_CATEGORIES,
  type CandidateItem,
} from "@/lib/generator/candidates";
import { personalBand, type Weather } from "@/lib/generator/rules";
import type { UiOccasion } from "@/lib/generator/types";

/**
 * "A camel overcoat unlocks 14 new outfits" is not a query — it is a
 * SIMULATION. For each archetypal missing piece, add it to the real closet in
 * memory, re-count what becomes buildable, and report the largest increase.
 *
 * The number is produced by the same eligibility code that builds real outfits,
 * so it means exactly what it says rather than approximating it. No AI call.
 */

/**
 * The archetypal pieces we know how to recommend. Deliberately small and
 * neutral: the claim is "this unlocks N outfits", and a wilder candidate would
 * inflate N while being something the user would never buy.
 */
export type GapCandidate = { label: string; category: string; colors: string[]; formality: number };

export const GAP_CANDIDATES: GapCandidate[] = [
  { label: "A camel overcoat", category: "Outerwear", colors: ["camel"], formality: 4 },
  { label: "Grey wool trousers", category: "Bottoms", colors: ["grey"], formality: 4 },
  { label: "A navy knit", category: "Tops", colors: ["navy"], formality: 3 },
  { label: "Brown leather loafers", category: "Shoes", colors: ["brown"], formality: 4 },
  { label: "A white oxford shirt", category: "Tops", colors: ["white"], formality: 4 },
  { label: "Dark denim", category: "Bottoms", colors: ["denim"], formality: 2 },
  { label: "Clean white sneakers", category: "Shoes", colors: ["white"], formality: 2 },
];

/**
 * ⚠️ `buildCandidates` stops at `CAP = 200` (lib/generator/candidates.ts). Any
 * closet big enough to exceed that returns 200 both BEFORE and AFTER the
 * hypothetical piece, so every `unlocks` is 0 and `biggestGap` returns null —
 * for exactly the users who would pay for this screen.
 *
 * So do not count combos. Count the product of the eligible required slots,
 * which is what the cap is truncating, and is the number the claim actually
 * means: how many outfits become buildable.
 */
function countCombos(closet: CandidateItem[], occasions: UiOccasion[], weather: Weather): number {
  return occasions.reduce((total, o) => {
    const args = {
      band: personalBand(o, null),
      weather,
      // No season preference: the gap is about what the wardrobe can BUILD, and
      // season only ever orders and scores (see lib/generator/season.ts). A
      // recommendation should not change because it is currently March.
      season: undefined,
      excludeItemIds: [],
      maxAccessories: 0,
    };
    const by = eligibleByCategory(closet, args);
    const slots = REQUIRED_CATEGORIES.map((c) => (by[c] ?? []).length);
    // A missing required slot means zero buildable outfits, not a partial count.
    return total + (slots.some((n) => n === 0) ? 0 : slots.reduce((a, b) => a * b, 1));
  }, 0);
}

/**
 * Which single hypothetical piece would unlock the most outfits.
 *
 * The number is produced by the SAME code that builds real outfits, so "unlocks
 * 14 new outfits" means exactly that — not a heuristic that resembles it.
 */
export function biggestGap(
  closet: CandidateItem[],
  occasions: UiOccasion[],
  weather: Weather,
): { candidate: GapCandidate; unlocks: number } | null {
  if (!closet.length) return null;

  const before = countCombos(closet, occasions, weather);
  let best: { candidate: GapCandidate; unlocks: number } | null = null;

  for (const c of GAP_CANDIDATES) {
    const hypothetical: CandidateItem = {
      id: "__hypothetical__",
      category: c.category,
      colors: c.colors,
      formality: c.formality,
      // Untagged on purpose: seasons, material, texture and pattern are all
      // "no opinion" values downstream, so the simulated piece is scored as
      // neutrally as possible. A hypothetical garment should not win by being
      // given flattering tags nobody has bought yet.
      seasons: [],
      material: null,
      pattern: "solid",
      texture: null,
    };
    const unlocks = countCombos([...closet, hypothetical], occasions, weather) - before;
    if (unlocks > 0 && (!best || unlocks > best.unlocks)) best = { candidate: c, unlocks };
  }
  return best;
}
