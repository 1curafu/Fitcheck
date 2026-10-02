import {
  eligibleByCategory,
  REQUIRED_CATEGORIES,
  type CandidateItem,
} from "@/lib/generator/candidates";
import { itemBlocked, type NoGo } from "@/lib/generator/nogos";
import { occasionBand, personalBand, weatherRules, type Weather } from "@/lib/generator/rules";
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
export type GapCandidate = {
  label: keyof typeof import("@/messages/en-US.json").stats.gapPieces;
  category: string;
  colors: string[];
  formality: number;
  /** Tags the no-go rules read (quiz part 2). Only `darkDenim` carries one today; every other candidate stays neutral. */
  material?: string;
  branding?: string;
};

/**
 * The occasions worth simulating for THIS wardrobe: those whose band the user's dress codes can reach. `personalBand`
 * falls back to the occasion's FULL band when there is no overlap (a Business-only wardrobe asking about Everyday), which
 * let the advice suggest pieces outside the user's own dress codes. No prefs, or nothing reachable at all, keeps every
 * occasion — better a broad answer than an empty one.
 */
export function relevantOccasions(occasions: UiOccasion[], prefs?: GapPrefs): UiOccasion[] {
  const min = prefs?.formality_min;
  const max = prefs?.formality_max;
  if (min == null || max == null) return occasions;
  const reachable = occasions.filter((o) => {
    const [olo, ohi] = occasionBand(o);
    return Math.max(olo, Math.max(1, min - 0.5)) <= Math.min(ohi, Math.min(5, max + 0.5));
  });
  return reachable.length ? reachable : occasions;
}

/** How many owned pieces the user's no-gos hide, per slot — so the advice can say "your no-gos" instead of "0 bottoms". */
export function hiddenByNogos(closet: CandidateItem[], occasions: UiOccasion[], prefs?: GapPrefs): Record<string, number> {
  const all = slotCounts(closet, occasions, { ...prefs, nogos: [] });
  const kept = slotCounts(closet, occasions, prefs);
  return Object.fromEntries(Object.keys(all).map((c) => [c, all[c] - (kept[c] ?? 0)]));
}

/** The quiz answers the advice honours (quiz part 2). Absent = today's behaviour. */
export type GapPrefs = { formality_min?: number | null; formality_max?: number | null; nogos?: readonly NoGo[] };

/**
 * Buildable outfits when no look may carry two denim garments: per slot, `n` eligible pieces of which `d` are denim;
 * `garment` marks the slots that count toward double denim (tops, bottoms, coats — not shoes).
 * = P × [ Π (n−d) + Σ_g d_g × Π_{h≠g} (n_h−d_h) ], P = product of the non-garment slots. Exact — pinned against brute force.
 */
export function denimSafeCount(slots: readonly { garment: boolean; n: number; d: number }[]): number {
  const other = slots.filter((s) => !s.garment).reduce((a, s) => a * s.n, 1);
  const g = slots.filter((s) => s.garment);
  const free = g.reduce((a, s) => a * (s.n - s.d), 1);
  const one = g.reduce((sum, s, i) => sum + s.d * g.reduce((a, h, j) => (j === i ? a : a * (h.n - h.d)), 1), 0);
  return other * (free + one);
}

export const GAP_CANDIDATES: GapCandidate[] = [
  // Staples that suit any wardrobe.
  { label: "navyKnit", category: "Tops", colors: ["navy"], formality: 3 },
  { label: "whiteShirt", category: "Tops", colors: ["white"], formality: 4 },
  { label: "woolTrousers", category: "Bottoms", colors: ["grey"], formality: 4 },
  { label: "darkDenim", category: "Bottoms", colors: ["denim"], formality: 2, material: "Denim" },
  { label: "camelCoat", category: "Outerwear", colors: ["camel"], formality: 4 },
  { label: "whiteSneakers", category: "Shoes", colors: ["white"], formality: 2 },
  { label: "brownLoafers", category: "Shoes", colors: ["brown"], formality: 4 },
  { label: "blackShoes", category: "Shoes", colors: ["black"], formality: 5 },
  // Suggested only to a wardrobe that already shows it wears them — see
  // `candidatesFor`.
  { label: "blackDress", category: "One-piece", colors: ["black"], formality: 4 },
  { label: "navyDress", category: "One-piece", colors: ["navy"], formality: 3 },
];

/**
 * The candidates worth proposing to THIS closet.
 *
 * ⚠️ Inferred from the wardrobe, never declared by the user. The product owner
 * asked whether to ask gender at onboarding; the answer was no, because
 * inference can only be less specific while a declared attribute can be WRONG —
 * stale when a wardrobe changes, wrong for a man who wears skirts, and awkward
 * for anyone non-binary. A closet holding dresses has already proven it wears
 * dresses better than any answer could.
 *
 * The rule is narrow on purpose: a category is only suggested if the closet
 * already contains one, EXCEPT for the shapes every wardrobe needs. Before this,
 * the list was menswear-only and would tell someone who wears dresses to buy a
 * white oxford shirt and brown loafers.
 */
export function candidatesFor(closet: CandidateItem[], prefs?: GapPrefs, list: GapCandidate[] = GAP_CANDIDATES): GapCandidate[] {
  const owns = new Set(closet.map((i) => i.category));
  // Shoes and outerwear are worn over everything; a top or bottom is only
  // proposed to a wardrobe that is not exclusively one-pieces.
  const universal = new Set(["Shoes", "Outerwear"]);
  const onlyOnePieces = owns.has("One-piece") && !owns.has("Tops") && !owns.has("Bottoms");
  return list.filter((c) => {
    // A suggestion the user's own no-gos rule out is never made (quiz part 2).
    if (prefs?.nogos?.length && itemBlocked(c, prefs.nogos)) return false;
    if (universal.has(c.category)) return true;
    if (c.category === "One-piece") return owns.has("One-piece");
    return !onlyOnePieces;
  });
}
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
function argsFor(o: UiOccasion, weather: Weather, prefs?: GapPrefs) {
  return {
    // The user's own dress codes (quiz): "what should I buy" for THIS wardrobe, not for every formality level.
    band: personalBand(o, prefs ?? null),
    // …and their no-gos, so pieces they hide are not counted as owned.
    nogos: prefs?.nogos,
    weather,
    // No season preference: the gap is about what the wardrobe can BUILD, and
    // season only ever orders and scores (see lib/generator/season.ts). A
    // recommendation should not change because it is currently March.
    season: undefined,
    excludeItemIds: [],
    maxAccessories: 0,
  };
}

function countCombos(closet: CandidateItem[], occasions: UiOccasion[], prefs?: GapPrefs): number {
  let total = 0;
  for (const weather of SIMULATED_CONDITIONS) {
    const { needsOuterwear } = weatherRules(weather);
    for (const o of occasions) {
      const by = eligibleByCategory(closet, argsFor(o, weather, prefs));
      // A missing required slot means zero buildable outfits, not a partial count.
      if (REQUIRED_CATEGORIES.some((c) => (by[c] ?? []).length === 0)) continue;
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
      const cats: string[] = needsOuterwear ? [...REQUIRED_CATEGORIES, "Outerwear"] : [...REQUIRED_CATEGORIES];
      const lists = cats.map((c) => by[c] ?? []);
      if (prefs?.nogos?.includes("double_denim")) {
        // No look may carry two denim garments: count exactly, not the plain slot product (quiz part 2).
        total += denimSafeCount(
          cats.map((c, i) => ({
            garment: c !== "Shoes",
            n: lists[i].length,
            d: lists[i].filter((it) => it.material?.toLowerCase() === "denim").length,
          })),
        );
      } else {
        total += lists.reduce((a, l) => a * l.length, 1);
      }
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
  prefs?: GapPrefs,
): Record<string, number> {
  const by = eligibleByCategory(closet, argsFor(relevantOccasions(occasions, prefs)[0] ?? "everyday", SIMULATED_CONDITIONS[0], prefs));
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
  prefs?: GapPrefs,
): { candidate: GapCandidate; unlocks: number; share: number | null } | null {
  if (!closet.length) return null;

  // Only the occasions the user's dress codes can reach (quiz part 2).
  occasions = relevantOccasions(occasions, prefs);
  const before = countCombos(closet, occasions, prefs);
  let best: { candidate: GapCandidate; unlocks: number; share: number | null } | null = null;

  for (const c of candidatesFor(closet, prefs)) {
    const hypothetical: CandidateItem = {
      id: "__hypothetical__",
      category: c.category,
      colors: c.colors,
      formality: c.formality,
      // Untagged on purpose: seasons, material, texture, pattern and accent are all
      // "no opinion" values downstream, so the simulated piece is scored as
      // neutrally as possible. A hypothetical garment should not win by being
      // given flattering tags nobody has bought yet.
      seasons: [],
      // …except the material the no-go rules must see (`darkDenim`); every other candidate stays neutral.
      material: c.material ?? null,
      pattern: "solid",
      texture: null,
      accent_color: null,
    };
    const unlocks = countCombos([...closet, hypothetical], occasions, prefs) - before;
    if (unlocks > 0 && (!best || unlocks > best.unlocks)) {
      /**
       * ⚠️ `share` is NULL when the wardrobe can currently build nothing at all
       * — a closet with no bottoms, or a user straight out of onboarding's
       * "capture your first five". A proportion of zero is not 0%, it is
       * undefined, and rendering it as a percentage produced the worst message
       * in the app at the moment it mattered most: going from ZERO buildable
       * outfits to 344 was displayed as "Adds 1% more outfits". The screen says
       * something else entirely for this case.
       */
      best = { candidate: c, unlocks, share: before > 0 ? unlocks / before : null };
    }
  }
  return best;
}
