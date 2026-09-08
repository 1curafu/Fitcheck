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

const CAP = 200;

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
  const shapes: ("acc1" | "acc2" | "bag" | "bagacc")[] = [];
  if (canAcc) shapes.push("acc1");
  if (canBag) shapes.push("bag");
  if (canAcc && maxAccessories >= 2) shapes.push("acc2");
  if (canAcc && canBag) shapes.push("bagacc");
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
  }
}

function bySeasonFirst(list: CandidateItem[], season: string | undefined): CandidateItem[] {
  return [...list].sort(
    (x, y) => Number(inSeason(y.seasons, season)) - Number(inSeason(x.seasons, season)),
  );
}

function isRequired(c: string): c is RequiredCategory {
  return (REQUIRED_CATEGORIES as readonly string[]).includes(c);
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
  return REQUIRED_CATEGORIES.find((c) => counts[c] === 0) ?? null;
}

export function buildCandidates(items: CandidateItem[], a: CandidateArgs): CandidateItem[][] {
  const { needsOuterwear } = weatherRules(a.weather, { rainGuard: a.rainGuard });

  // Season ordering and material relief both live in `eligibleByCategory`, so
  // this function, `eligibility` and `missingCategory` can never disagree about
  // what the closet can do. Ordering in-season-first matters because the CAP
  // below truncates the combo list, and the breadth-first walk indexes outerwear
  // and accessories modulo their list length — so the earliest passes reach the
  // seasonally right coat and accessory.
  const by = eligibleByCategory(items, a);
  const tops = by.Tops ?? [];
  const bottoms = by.Bottoms ?? [];
  const shoes = by.Shoes ?? [];
  const outer = by.Outerwear ?? [];
  const accessories = by.Accessories ?? [];
  const bags = by.Bags ?? [];

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
  // fresh pairings rather than exhausting one corner of the space. The shoe
  // offset uses a stride coprime with the shoe count so pairings do not repeat
  // early AND every shoe is still reachable — a fixed stride of 2 failed the
  // second half of that on any even-length list (see `decorrelatedStride`).
  const passes = Math.max(bottoms.length, shoes.length);
  const shoeStride = decorrelatedStride(shoes.length);

  build: for (let d = 0; d < passes; d++) {
    for (let t = 0; t < tops.length; t++) {
      const b = bottoms[(t + d) % bottoms.length];
      const s = shoes[(t + d * shoeStride) % shoes.length];

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

      // ⚠️ Still exactly ONE push per base, whatever it carries. A separate
      // push per variant would spend the CAP on permutations of the same three
      // garments — precisely the failure the breadth-first walk above exists to
      // prevent, measured at 13 of 80 garments stranded. `pickExtras` returns
      // one variant and rotates which one.
      //
      // Rotating on `t + d` rather than on `d` alone matters: `passes` is 1 for
      // a closet with a single bottom and a single shoe, so keying on the pass
      // would make every variant past the first unreachable there.
      const extras = pickExtras(accessories, bags, t + d, a.maxAccessories, a.maxBags ?? 0);
      if (extras.length) {
        combos.push([...base, ...extras]);
        if (combos.length >= CAP) break build;
      }
    }
  }

  // Colour is deliberately NOT filtered here. The Refine palette is a lean, and
  // leans are expressed by ranking (`scoreCombo`'s lean term), not by exclusion —
  // the same soft-preference model outerwear moved to above.
  return combos;
}
