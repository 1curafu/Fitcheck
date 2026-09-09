import { weatherRules, type Weather } from "./rules";
import { inSeason } from "./season";
import { itemWarmth } from "./texture";

export type CandidateItem = {
  id: string;
  category: string; // DB TitleCase: Tops/Bottoms/Outerwear/Shoes/Accessories/Fragrance
  colors: string[];
  formality: number | null;
  seasons: string[];
  material: string | null;
  /** Read together with `material` as warmth — see ./texture.ts. */
  texture: string | null;
  pattern: string | null;
  /**
   * The garment's ONE small contrast colour — a logo, a sole, a buckle.
   *
   * Carried through candidate building untouched (nothing here filters on it)
   * so `scoreCombo` can hand it to the colour-ECHO term, and only that term —
   * see the contract on `colourScore`.
   *
   * Optional, like every other tag field added after the fact: most garments
   * genuinely have no accent, and a fixture or caller that does not care about
   * one should not have to state `null`.
   *
   * ⚠️ **The TYPE is the guard here, not a test.** `buildCandidates` passes
   * item REFERENCES through and never reconstructs them, so removing this field
   * would leave it on the runtime object and every test would still pass —
   * only `tsc` would object, at the mapping sites in `app/generate/actions.ts`
   * and friends. Deleting it is a compile error there; it is not a test failure
   * anywhere.
   */
  accent_color?: string | null;
  /**
   * The garment's specific kind ("Chain bracelet", "Quartz watch").
   *
   * Used for ONE thing: stopping a two-accessory look from being two of the
   * same thing. Optional for the same reason `accent_color` is — a caller that
   * never asks for a second accessory has no use for it — but note the
   * asymmetry with that field: an absent `subcategory` is not neutral here, it
   * SUPPRESSES the second accessory (see `pickAccessories`). Silence is not
   * evidence that two items differ.
   */
  subcategory?: string | null;
  /** Sole bulk, carried through for `footwearAgainstOutfit`. */
  bulk?: string | null;
  /** Branding prominence and visible wear, carried through for the rule registry. */
  branding?: string | null;
  distressing?: string | null;
};

export type CandidateArgs = {
  band: [number, number];
  weather: Weather;
  /**
   * The current season. **Optional: absent means no season preference at all.**
   *
   * `bySeasonFirst` has always accepted `string | undefined` and season only
   * ever ORDERS the lists (see ./season.ts), so this was over-strict rather
   * than load-bearing. The gap analysis is the caller that needs it: a
   * recommendation for what to buy must not change because it happens to be
   * March, and the alternative was `undefined as unknown as string`.
   */
  season?: string;
  excludeItemIds: string[];
  maxAccessories: number;
  /**
   * How many BAGS a look may carry. Optional and defaulting to none, so every
   * existing caller and fixture keeps the behaviour it had before bags were a
   * category of their own.
   *
   * Separate from `maxAccessories` because the two behave differently: you
   * carry one bag but may wear a watch AND a bracelet, and a bag is a visible
   * colour block where a watch case is hardware (see ./styling/metal.ts).
   */
  maxBags?: number;
  /**
   * The user's rain-guard preference. Optional and defaulting ON, so every
   * existing caller and fixture keeps the protective behaviour it had before
   * the toggle existed.
   *
   * A bare boolean rather than the whole `Preferences` object: the generator
   * has no business importing a module that also carries display concerns like
   * the temperature unit.
   */
  rainGuard?: boolean;
};

/**
 * How many candidate combos ranking may see.
 *
 * ⚠️ Raised 200 -> 300 when a SECOND extras variant per base was added, and the
 * two numbers must move together. The property that matters is that pass 0
 * reaches every top, which needs `tops * pushesPerIteration <= CAP`: at 2 pushes
 * and 200 that held to 100 tops, and at 3 pushes and 300 it still does. Raising
 * the pushes alone would have cut it to 66 — the same stranding the
 * breadth-first walk was written to fix.
 *
 * The cost is scoring ~50% more combos, which is pure local arithmetic; the
 * model still only ever sees the top handful, so this does not change AI spend.
 */
const CAP = 300;

function gcd(x: number, y: number): number {
  return y === 0 ? x : gcd(y, x % y);
}

/**
 * A step size that visits every index of a list of length `n` before repeating.
 *
 * `buildCandidates` walks shoes with a stride so their pairing does not move in
 * lockstep with bottoms. A FIXED stride of 2 was wrong: it shares a factor with
 * every even list length, so with one top — where the top index cannot supply
 * variation — a two-shoe closet reached only the first pair, and emitted the
 * same combo twice. Any stride coprime with `n` visits all of it, so pick the
 * smallest one above 1 and fall back to 1 for n ≤ 2.
 */
function decorrelatedStride(n: number): number {
  for (let s = 2; s < n; s++) if (gcd(s, n) === 1) return s;
  return 1;
}

/** The required slots — a combo cannot exist without one of each. */
/**
 * The two shapes a look can take.
 *
 * ⚠️ A one-piece fills the upper AND lower slot, so a dress look genuinely has
 * no `Bottoms` and is not missing one. Treating the separates shape as the only
 * valid one is what made a dress unrepresentable: `buildCandidates` returned
 * nothing, and `missingCategory` told a dress wardrobe it had no trousers.
 *
 * ⚠️ A garment shape, never a gender. A boilersuit takes the same slot as a
 * wrap dress.
 */
export const SEPARATES_SHAPE = ["Tops", "Bottoms", "Shoes"] as const;
export const ONE_PIECE_SHAPE = ["One-piece", "Shoes"] as const;

/** Kept for callers that ask "which slot is empty" — see `missingCategory`. */
export const REQUIRED_CATEGORIES = SEPARATES_SHAPE;
export type RequiredCategory = (typeof SEPARATES_SHAPE)[number] | "One-piece";

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

function materialExcluded(material: string | null, excludeMaterials: string[]): boolean {
  if (!material) return false;
  const m = material.toLowerCase();
  // Substring, not equality: the tagger writes free text, so "merino wool" and
  // "suede leather" are real values that an exact match silently let through.
  return excludeMaterials.some((x) => m.includes(x));
}

/**
 * The weather bars, held together so the relief rule can drop ALL of them at
 * once. Splitting them let a later bar survive relief and empty a slot anyway.
 */
type WeatherBars = { excludeMaterials: string[]; maxWarmth: number | null };
const NO_BARS: WeatherBars = { excludeMaterials: [], maxWarmth: null };

function isEligible(i: CandidateItem, a: CandidateArgs, bars: WeatherBars): boolean {
  const [lo, hi] = a.band;
  if (i.category === "Fragrance") return false; // D11: fragrances are never slotted
  if (a.excludeItemIds.includes(i.id)) return false;
  if (materialExcluded(i.material, bars.excludeMaterials)) return false;
  // On a genuinely sweltering day warmth stops being a preference. Reads the
  // wearer's season tags, so a cable knit they wear in July survives and one
  // they only wear in November does not — see lib/generator/texture.ts.
  if (bars.maxWarmth != null && itemWarmth(i.material, i.texture, i.seasons) >= bars.maxWarmth) {
    return false;
  }
  // Season is deliberately NOT filtered here — see ./season.ts. It orders the
  // lists below and weights the score instead. Filtering ran against every
  // required slot, so one narrowly-tagged category zeroed the whole result:
  // measured on a wearable 10-top/4-bottom/4-shoe closet whose trousers merely
  // lacked a Winter tag, the same wardrobe gave 40 combos in summer and 0 in
  // winter.
  const f = i.formality ?? 3;
  return f >= lo - floorTolerance(i.category) && f <= hi + 0.5;
}

/**
 * The accessories to hang on one base, at most `max` of them.
 *
 * ⚠️ **Two is a ceiling, not a target, and the second one has to EARN its
 * place.** Two bracelets — or a watch and a second watch — is worse than one,
 * so a second pick is only made from a DIFFERENT subcategory. When nothing in
 * the list qualifies (a closet of three bracelets, or a caller that does not
 * carry `subcategory` through at all) this returns a single accessory. An
 * unprovable duplicate is not worth styling.
 */
function pickAccessories(list: CandidateItem[], seed: number, max: number): CandidateItem[] {
  const first = list[seed % list.length];
  if (max < 2 || list.length < 2) return [first];
  const kind = (i: CandidateItem) => i.subcategory?.trim().toLowerCase() || null;
  const firstKind = kind(first);
  for (let k = 1; k < list.length; k++) {
    const next = list[(seed + k) % list.length];
    const nextKind = kind(next);
    // Both kinds must be KNOWN and different.
    if (firstKind && nextKind && firstKind !== nextKind) return [first, next];
  }
  return [first];
}

/**
 * The optional pieces to hang on one base: accessories, a bag, or both.
 *
 * ⚠️ **Returns ONE variant, never a set.** The caller pushes it once, so the
 * combo budget is spent on garments rather than on permutations of the same
 * three. Offering every combination here would reintroduce exactly the failure
 * the breadth-first walk exists to prevent: measured, a second extras push
 * stranded 13 of 80 garments once the CAP bound.
 *
 * Which variant is chosen rotates with the seed, so across a pass the ranker
 * sees bare looks, accessorised looks, bagged looks and both — and the score,
 * not this function, decides which survives.
 *
 * Variants are built conditionally rather than filtered afterwards, so a closet
 * with no bags never rotates through a bag-shaped hole and a closet with one
 * accessory never offers the same single accessory twice under two names.
 */
/** Whether two extras picks are the same set of items, so one can be skipped. */
function sameItems(a: CandidateItem[], b: CandidateItem[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((i) => i.id));
  return b.every((i) => ids.has(i.id));
}

function pickExtras(
  accessories: CandidateItem[],
  bags: CandidateItem[],
  seed: number,
  maxAccessories: number,
  maxBags: number,
): CandidateItem[] {
  const canAcc = maxAccessories > 0 && accessories.length > 0;
  const canBag = maxBags > 0 && bags.length > 0;

  // ⚠️ The SHAPES are decided before anything is picked, so the list length
  // does not depend on the seed. An earlier version appended the two-accessory
  // variant only when that seed's first accessory happened to find a differing
  // subcategory, which made `variants.length` vary between 3 and 4 as the seed
  // moved — so `seed % length` addressed different variants on different
  // iterations and "bag + accessory" was never reached at all. Measured on a
  // six-top closet: 6 one-accessory, 4 bag, 2 two-accessory, and zero of the
  // fourth shape. A rotation has to rotate over a fixed set.
  const shapes: ("acc1" | "acc2" | "bag" | "bagacc" | "bagacc2")[] = [];
  if (canAcc) shapes.push("acc1");
  if (canBag) shapes.push("bag");
  if (canAcc && maxAccessories >= 2) shapes.push("acc2");
  if (canAcc && canBag) shapes.push("bagacc");
  // ⚠️ The caps allow a bag AND two accessories, so a shape has to produce it.
  // Without this, `maxBags: 1` with `maxAccessories: 2` promised a combination
  // the builder could never build: measured 0 of 231 combos carried a bag with
  // two accessories, while every other permitted shape appeared ~38 times.
  if (canAcc && canBag && maxAccessories >= 2) shapes.push("bagacc2");
  if (!shapes.length) return [];

  const bag = () => [bags[seed % bags.length]];
  // A shape that cannot be filled degrades rather than disappearing: a closet
  // holding three bracelets yields one accessory where "acc2" asked for two.
  switch (shapes[seed % shapes.length]) {
    case "acc1":
      return pickAccessories(accessories, seed, 1);
    case "acc2":
      return pickAccessories(accessories, seed, maxAccessories);
    case "bag":
      return bag();
    case "bagacc":
      return [...bag(), ...pickAccessories(accessories, seed, 1)];
    case "bagacc2":
      return [...bag(), ...pickAccessories(accessories, seed, maxAccessories)];
  }
}

function bySeasonFirst(list: CandidateItem[], season: string | undefined): CandidateItem[] {
  return [...list].sort(
    (x, y) => Number(inSeason(y.seasons, season)) - Number(inSeason(x.seasons, season)),
  );
}

function isRequired(c: string): c is RequiredCategory {
  // One-piece counts: a dress-only closet must get the same material-relief
  // treatment on a sweltering day that a top-and-trousers closet gets.
  return [...SEPARATES_SHAPE, ...ONE_PIECE_SHAPE].includes(c as never);
}

/**
 * The eligible items of every category, in-season first.
 *
 * Two soft rules live here, and `eligibility`, `missingCategory` and
 * `buildCandidates` all read from this one function so they can never disagree
 * about what the closet can do:
 *
 * 1. Season ORDERS, never excludes. The CAP in `buildCandidates` truncates the
 *    combo list, so in-season pieces must come first or a large off-season
 *    closet could push the good combos past the cap.
 * 2. Material RELIEF: a weather exclusion may narrow a REQUIRED slot but must
 *    never empty it. A closet whose only shoes are suede should get its suede
 *    shoes on a wet day, not an empty screen blaming "Shoes". Relief is scoped
 *    to weather exclusions — a formality gap is a real wardrobe gap and is still
 *    reported.
 */
export function eligibleByCategory(
  items: CandidateItem[],
  a: CandidateArgs,
): Record<string, CandidateItem[]> {
  const { excludeMaterials, maxWarmth } = weatherRules(a.weather, { rainGuard: a.rainGuard });
  const bars: WeatherBars = { excludeMaterials, maxWarmth };
  const cats = new Set<string>(items.map((i) => i.category));
  for (const c of REQUIRED_CATEGORIES) cats.add(c);
  cats.add("Outerwear");

  const out: Record<string, CandidateItem[]> = {};
  for (const c of cats) {
    const inCat = items.filter((i) => i.category === c);
    let list = inCat.filter((i) => isEligible(i, a, bars));
    if (!list.length && isRequired(c)) list = inCat.filter((i) => isEligible(i, a, NO_BARS));
    out[c] = bySeasonFirst(list, a.season);
  }
  return out;
}

/** Per-category counts of what survived filtering — lets an empty result explain itself. */
export function eligibility(items: CandidateItem[], a: CandidateArgs): Record<string, number> {
  const by = eligibleByCategory(items, a);
  const counts: Record<string, number> = {};
  for (const c of Object.keys(by)) counts[c] = by[c].length;
  return counts;
}

/**
 * Which required slot came up empty, or null if the closet can dress this band.
 * The screen uses this to say WHICH gap blocked the outfit instead of a generic
 * "add more pieces". Outerwear is never a reason — it does not block (see below).
 */
export function missingCategory(items: CandidateItem[], a: CandidateArgs): RequiredCategory | null {
  const counts = eligibility(items, a);
  const has = (c: string) => (counts[c] ?? 0) > 0;

  // Either shape being complete means nothing is missing.
  const canSeparates = SEPARATES_SHAPE.every(has);
  const canOnePiece = ONE_PIECE_SHAPE.every(has);
  if (canSeparates || canOnePiece) return null;

  // ⚠️ Shoes first: they block BOTH shapes, so naming a missing top to someone
  // who owns dresses and no shoes would send them after the wrong thing.
  if (!has("Shoes")) return "Shoes";
  // Reaching here means neither shape is complete AND shoes exist, so the gap
  // is in the separates. A one-piece closet cannot reach this line: with shoes
  // it satisfies `canOnePiece` above, and without them it was answered as Shoes.
  return SEPARATES_SHAPE.find((c) => !has(c)) ?? null;
}

/**
 * Round-robin two lists into one, capped.
 *
 * ⚠️ Round-robin rather than an even split, and this matters for a mixed
 * wardrobe: a closet with thirty separates and two dresses should not hand half
 * the budget to two dresses repeated. Taking one from each in turn lets the
 * shorter list run out and the longer one carry on, so each shape gets a share
 * of the cap proportional to what it can actually build.
 */
function interleave(a: CandidateItem[][], b: CandidateItem[][], cap: number): CandidateItem[][] {
  const out: CandidateItem[][] = [];
  for (let i = 0; out.length < cap && (i < a.length || i < b.length); i++) {
    if (i < a.length && out.length < cap) out.push(a[i]);
    if (i < b.length && out.length < cap) out.push(b[i]);
  }
  return out;
}

/**
 * Walk one base shape breadth-first, pushing a bare look and up to two
 * accessorised variants per base.
 *
 * `uppers` is whatever occupies the first slot — tops for separates, one-pieces
 * for a dress look — and `lowers` is empty for a one-piece, which is exactly
 * what having no bottoms means.
 */
function walkShape(
  uppers: CandidateItem[],
  lowers: CandidateItem[],
  shoes: CandidateItem[],
  outer: CandidateItem[],
  needsOuterwear: boolean,
  accessories: CandidateItem[],
  bags: CandidateItem[],
  a: CandidateArgs,
  cap: number,
): CandidateItem[][] {
  if (!uppers.length || !shoes.length) return [];
  const combos: CandidateItem[][] = [];
  const passes = Math.max(lowers.length || 1, shoes.length);
  const shoeStride = decorrelatedStride(shoes.length);

  build: for (let d = 0; d < passes; d++) {
    for (let t = 0; t < uppers.length; t++) {
      const s = shoes[(t + d * shoeStride) % shoes.length];
      const core = lowers.length
        ? [uppers[t], lowers[(t + d) % lowers.length], s]
        : [uppers[t], s];

      // Outerwear is a PREFERENCE, not a requirement: layer it in when the cold
      // calls for it and the closet has one, but never refuse to dress someone
      // who owns no coat — that silently killed every outfit below 15°. The
      // index rotates too; it was pinned to [0], so one coat was worn on every
      // cold day and every other coat was unreachable.
      const base =
        needsOuterwear && outer.length ? [...core, outer[(t + d) % outer.length]] : core;

      combos.push(base);
      if (combos.length >= cap) break build;

      const extrasA = pickExtras(accessories, bags, t + d, a.maxAccessories, a.maxBags ?? 0);
      if (extrasA.length) {
        combos.push([...base, ...extrasA]);
        if (combos.length >= cap) break build;
      }
      const extrasB = pickExtras(accessories, bags, t + d + 1, a.maxAccessories, a.maxBags ?? 0);
      if (extrasB.length && !sameItems(extrasA, extrasB)) {
        combos.push([...base, ...extrasB]);
        if (combos.length >= cap) break build;
      }
    }
  }
  return combos;
}

export function buildCandidates(items: CandidateItem[], a: CandidateArgs): CandidateItem[][] {
  const { needsOuterwear } = weatherRules(a.weather, { rainGuard: a.rainGuard });

  // Season ordering and material relief both live in `eligibleByCategory`, so
  // this function, `eligibility` and `missingCategory` can never disagree about
  // what the closet can do. Ordering in-season-first matters because the CAP
  // truncates the combo list, and the walk indexes outerwear and accessories
  // modulo their list length — so the earliest passes reach the seasonally right
  // coat and accessory.
  const by = eligibleByCategory(items, a);
  const tops = by.Tops ?? [];
  const bottoms = by.Bottoms ?? [];
  const onePieces = by["One-piece"] ?? [];
  const shoes = by.Shoes ?? [];
  const outer = by.Outerwear ?? [];
  const accessories = by.Accessories ?? [];
  const bags = by.Bags ?? [];

  // ⚠️ TWO valid shapes. A dress look genuinely has no bottoms; requiring them
  // is what made a one-piece unrepresentable.
  const separates =
    tops.length && bottoms.length
      ? walkShape(tops, bottoms, shoes, outer, needsOuterwear, accessories, bags, a, CAP)
      : [];
  const onePiece = walkShape(onePieces, [], shoes, outer, needsOuterwear, accessories, bags, a, CAP);

  return interleave(separates, onePiece, CAP);
}

// Colour is deliberately NOT filtered anywhere above. The Refine palette is a
// lean, and leans are expressed by ranking (`scoreCombo`'s lean term), not by
// exclusion — the same soft-preference model outerwear uses.
