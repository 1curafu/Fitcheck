import {
  eligibleByCategory,
  REQUIRED_CATEGORIES,
  type CandidateItem,
} from "@/lib/generator/candidates";
import { personalBand, weatherRules, type Weather } from "@/lib/generator/rules";
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
 * The conditions the simulation runs against — a cold day and a mild one.
 *
 * Deliberately NOT today's forecast. This screen answers "what should I buy",
 * and that answer must not change because it happens to be raining: a user who
 * checks on Tuesday and again on Thursday would be told to buy two different
 * things. Both are dry, so no wet-material rule fires and the count measures
 * the WARDROBE rather than the week. It is also why this screen makes no
 * network call of any kind.
 *
 * ⚠️ **The cold pass is what lets outerwear compete at all.** A single mild
 * temperature was the first implementation, and `needsOuterwear` is false above
 * 15° — so no simulated combination ever contained a coat, every outerwear
 * candidate scored exactly 0, and "A camel overcoat unlocks 14 new outfits",
 * the design's own headline example, was unreachable for every user forever.
 * Measured on the 21-item dev closet: a camel overcoat scored +0 while white
 * sneakers scored +258.
 */
export const SIMULATED_CONDITIONS: Weather[] = [
  { tempC: 5, rain: false },
  { tempC: 20, rain: false },
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
function argsFor(o: UiOccasion, weather: Weather) {
  return {
    band: personalBand(o, null),
    weather,
    // No season preference: the gap is about what the wardrobe can BUILD, and
    // season only ever orders and scores (see lib/generator/season.ts). A
    // recommendation should not change because it is currently March.
    season: undefined,
    excludeItemIds: [],
    maxAccessories: 0,
  };
}

function countCombos(closet: CandidateItem[], occasions: UiOccasion[]): number {
  let total = 0;
  for (const weather of SIMULATED_CONDITIONS) {
    const { needsOuterwear } = weatherRules(weather);
    for (const o of occasions) {
      const by = eligibleByCategory(closet, argsFor(o, weather));
      const slots = REQUIRED_CATEGORIES.map((c) => (by[c] ?? []).length);
      // A missing required slot means zero buildable outfits, not a partial count.
      if (slots.some((n) => n === 0)) continue;
      const base = slots.reduce((a, b) => a * b, 1);
      /**
       * ⚠️ On the COLD pass outerwear counts as a required slot, so a closet
       * with no coat scores ZERO cold-weather outfits.
       *
       * This is a deliberate departure from `buildCandidates`, which never lets
       * outerwear block — a coatless user still gets looks at 5°, correctly,
       * because an imperfect outfit beats an empty screen. But the question
       * THIS screen answers is different: "what should I buy?" And a plain slot
       * product cannot answer it, because going from 0 coats to 1 leaves the
       * number of combinations unchanged (one variant either way), so the first
       * coat — the single most valuable purchase a coatless person can make —
       * would score exactly 0 and never be recommended. Counting it as required
       * says the true thing: without a coat you cannot properly dress for half
       * the year, and buying one opens all of it.
       */
      const coats = (by["Outerwear"] ?? []).length;
      if (needsOuterwear) total += base * coats;
      else total += base;
    }
  }
  return total;
}

/**
 * The slot holding the wardrobe back, and the one that is deepest.
 *
 * This is what the simulation actually discovers. A wardrobe is a PRODUCT of
 * its slots, so the marginal value of one more piece is the product of all the
 * others — which means the winner is always the smallest slot, and the size of
 * the win is exactly `1 / (size of that slot)`. Saying "3 pairs of shoes
 * against 11 tops" is therefore not a decoration on the number; it IS the
 * finding, in units the user can verify by counting.
 */
/**
 * How many wearable pieces the closet holds in each slot the simulation uses.
 *
 * ⚠️ Includes **Outerwear**, which `REQUIRED_CATEGORIES` does not. Leaving it
 * out made the card contradict itself on the real dev closet: it recommended a
 * camel overcoat and then explained *"you have 4 shoes against 10 tops"* — a
 * reason for a different purchase. Whatever the winner is, the sentence has to
 * be about the winner.
 *
 * Counted on the COLD pass, the only one where every slot is in play.
 */
export function slotCounts(
  closet: CandidateItem[],
  occasions: UiOccasion[],
): Record<string, number> {
  const by = eligibleByCategory(closet, argsFor(occasions[0] ?? "everyday", SIMULATED_CONDITIONS[0]));
  const out: Record<string, number> = {};
  for (const c of [...REQUIRED_CATEGORIES, "Outerwear"]) out[c] = (by[c] ?? []).length;
  return out;
}

/**
 * Which single hypothetical piece would unlock the most outfits, and by how
 * much — **as a share of what the wardrobe can already do.**
 *
 * ⚠️ The raw count is deliberately NOT what the screen shows, and this is the
 * decision most worth preserving here. Measured on the 21-item dev closet it
 * came out at **258 new outfits**, which is arithmetically exact and completely
 * uncredible — the design's own example was 14. Worse, the count scales with
 * parameters we invented: four occasions rather than one, two simulated
 * conditions rather than one. Adding the cold pass doubled it overnight for an
 * unchanged wardrobe. **A number that moves when an internal constant changes
 * cannot be defended to a customer.**
 *
 * `share` is invariant to all of it. Because a wardrobe is a product of its
 * slots, adding one piece to a slot of size `s` multiplies the total by
 * `(s+1)/s` — so the share is exactly `1/s`, independent of every other slot
 * and of how many occasions or conditions we sum over. It also self-regulates:
 * it only gets small when that slot is genuinely deep, which is precisely when
 * the honest answer is "you do not need another one".
 */
export function biggestGap(
  closet: CandidateItem[],
  occasions: UiOccasion[],
): { candidate: GapCandidate; unlocks: number; share: number } | null {
  if (!closet.length) return null;

  const before = countCombos(closet, occasions);
  let best: { candidate: GapCandidate; unlocks: number; share: number } | null = null;

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
    const unlocks = countCombos([...closet, hypothetical], occasions) - before;
    if (unlocks > 0 && (!best || unlocks > best.unlocks)) {
      best = { candidate: c, unlocks, share: before > 0 ? unlocks / before : 0 };
    }
  }
  return best;
}
