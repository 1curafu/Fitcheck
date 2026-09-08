import { leanScore } from "./color";
import { seasonFit } from "./season";
import { accentMetalTone, isHardware, metalCoordination } from "./styling/metal";
import { warmthFit } from "./texture";
import { colourScore } from "./styling/colour-score";
import { visualSeparation } from "./styling/value";
import { valueDirection } from "./styling/direction";
import { canonicalTrio } from "./styling/trios";

export type ScoreItem = {
  category: string;
  /**
   * The specific kind ("Quartz watch", "Chain bracelet").
   *
   * Read by `wristwearBonus` alone. Optional, like every field added after the
   * fact — but note the consequence of omitting it: the wristwear reward
   * silently never fires, because a missing subcategory is indistinguishable
   * from "not a watch". `CandidateItem` carries the same field and every
   * producer of one populates it, which is what keeps the two aligned.
   */
  subcategory?: string | null;
  colors: string[];
  formality: number | null;
  seasons?: string[];
  /** "solid" | "striped" | "check" | "print" | "other". Null = no opinion. */
  pattern?: string | null;
  /** Fibre and construction. Together they carry warmth — see ./texture.ts. */
  material?: string | null;
  texture?: string | null;
  /**
   * The garment's ONE small contrast colour — a logo, a sole, a buckle.
   *
   * Deliberately separate from `colors`, and it reaches exactly one signal:
   * colour ECHO. See the contract on `colourScore`.
   */
  accent_color?: string | null;
};
export type Ctx = {
  aesthetic: string[];
  band: [number, number];
  /** Refine "Lean into" colour families. Empty = no preference. */
  lean?: string[];
  /**
   * Item ids from the set a regenerate is replacing. A SOFT preference applied
   * in `rankTopN`, never a filter: pieces sink in the ranking but are never
   * removed from the closet, so a small wardrobe still returns its one good
   * outfit instead of an empty screen.
   */
  recentlyShown?: string[];
  /** The current season ("Winter"). Absent = no season preference at all. */
  season?: string;
  /**
   * Today's temperature. Absent = no thermal reading, so the climate term falls
   * back to the season tag alone. Threaded from the forecast the generator
   * already fetches.
   */
  tempC?: number;
};

/**
 * Every signal's weight, in one place. A signal claims its weight ONLY when it
 * has evidence, and the total is normalised over whatever claimed — so a
 * signal's influence relative to any other is fixed by these two numbers and
 * nothing else.
 *
 * ⚠️ Replaces a subtractive budget in which `lean` and `climate` carved their
 * share out of the base, so a term's real influence depended on which OTHER
 * terms happened to apply: with both preferences active the base retained only
 * `1 - 0.3 - 0.28 = 0.42`, dropping `colour` to `0.4 × 0.42 = 0.168` while
 * `lean` kept a full 0.3 — and a reviewer separately measured `harmony` falling
 * from 0.40 to 0.12 of the final score through the same mechanism. Adding any
 * new signal was therefore a negotiation with every existing one rather than a
 * decision about the signal, which is what made a value-contrast term
 * unschedulable.
 *
 * The numbers below are UNCHANGED — the same relative proportions the
 * subtractive form declared; only the combination moved. Adding a signal is now
 * one entry here and one line in `terms`.
 *
 * `colour`, `coherence` and `pattern` are the always-present terms and sum to
 * 0.85, so a context with no preferences at all normalises over what claimed.
 *
 * `lean` is high enough to reorder the top 20 decisively, low enough that a
 * combo missing the colour still beats an incoherent one that has it — the lean
 * is a preference, never an eliminator.
 *
 * `climate` sits slightly above the 0.2 that season alone used to carry — the
 * term now reads a real temperature rather than only the month — and still low
 * enough that an off-season combo which actually works beats an in-season mess.
 */
const WEIGHTS = {
  colour: 0.4,
  coherence: 0.3,
  pattern: 0.15,
  lean: 0.3,
  climate: 0.28,
  metal: 0.1,
  // Small on purpose — see `wristwearBonus`. It breaks a tie against an
  // identical bare outfit; it must never outweigh a formality clash.
  wristwear: 0.08,
  /**
   * Whether the outfit's pieces read as separate at all — by value, or failing
   * that by surface.
   *
   * Weighted below `colour` (0.4) and `coherence` (0.3): it answers a narrower
   * question than either, and a muddy outfit in the right colours is a milder
   * fault than a formality clash. Above `pattern` (0.15), because pattern only
   * counts loud pieces while this is the signal that judges a monochrome outfit
   * at all — since achromatics stopped voting on temperature, 53% of the real
   * closet's combos have no temperature opinion, and this is what replaces it.
   */
  separation: 0.2,
  /**
   * Which way round the light and dark sit. Weighted with `pattern` (0.15):
   * it is a real, repeatedly-sourced rule but a narrower one than colour or
   * formality, and the research frames the inverted direction as SEASONAL
   * rather than wrong.
   */
  direction: 0.15,
  /**
   * A documented trio. The only term that can say an outfit is actively GOOD —
   * every other colour signal can merely decline to punish it. Weighted with
   * `pattern` and `direction`: strong enough to lift a canonical look above an
   * inoffensive one, not strong enough to carry an outfit that fails elsewhere.
   */
  canonical: 0.15,
} as const;

/**
 * Within climate, how much of the vote the thermometer gets over the tag.
 *
 * Warmth leads because it reads today's temperature against this garment's
 * fibre and construction, where `seasons` is a coarse, user-editable proxy
 * that no closet fills in reliably. The tag keeps a real share because it
 * carries what fabric cannot say — a linen suit is Summer, a Christmas jumper
 * is December — and because it is the only climate signal left when a forecast
 * fails.
 */
const WARMTH_SHARE = 0.7;

/** 1.0 = identical formality; falls off with spread. */
export function formalityCoherence(formalities: number[]): number {
  const f = formalities.filter((x) => typeof x === "number");
  if (f.length < 2) return 1;
  const spread = Math.max(...f) - Math.min(...f);
  return Math.max(0, 1 - spread / 4); // spread of 4 (1↔5) → 0
}

/**
 * Categories whose formality is a RANGE rather than a point.
 *
 * A steel watch is business-safe and casual-acceptable; a leather bag crosses
 * the same span. A jacket does not — it pins an outfit's register. So a small
 * worn or carried object may sit one step outside the garments' range without
 * that counting as incoherence.
 *
 * ⚠️ SHOES belong here too, and `candidates.ts` already says why: its
 * `floorTolerance` gives footwear a wider eligibility band because "a clean
 * minimal leather sneaker is genuinely valid smart-casual work wear". Scoring
 * never inherited that, so a dress with sneakers — an ordinary modern outfit —
 * took the full two-step charge and the engine preferred heels in every
 * register. The research agrees: white sneakers are described as near-universal
 * anchors.
 *
 * ⚠️ Not a licence to ignore it. Two steps out is still counted, because the
 * research's own HARD rules are exactly the two-step cases: a rubber sports
 * watch with black tie, a nylon bag against formal tailoring.
 */
const RANGED_FORMALITY = new Set(["Accessories", "Bags", "Shoes"]);

/** How far outside the garments' range a small item may sit for free. */
const RANGED_TOLERANCE = 1;

/**
 * `formalityCoherence`, but counting an accessory as the wide thing it is.
 *
 * ⚠️ Written because a f3 watch cost a f2 casual outfit 0.25 of its coherence —
 * the same charge a f3 pair of trousers would take. Measured end to end, adding
 * a well-matched steel watch to a casual look cost 0.0662 of the final score, so
 * the generator dropped it from every casual outfit. That is the opposite of
 * what a watch does in life, and the entire penalty came from this one term:
 * the colour terms were unmoved, because a watch is hardware and carries no
 * garment colour (see ./styling/metal.ts).
 *
 * `candidates.ts` already encodes this idea for shoes — `floorTolerance` lets a
 * clean sneaker reach Work — and this is the same argument one layer up.
 */
export function formalityCoherenceOf(
  items: { formality?: number | null; category?: string | null }[],
): number {
  const garments = items.filter((i) => !RANGED_FORMALITY.has(i.category ?? ""));
  const ranged = items.filter((i) => RANGED_FORMALITY.has(i.category ?? ""));
  const fOf = (i: { formality?: number | null }) => i.formality ?? 3;

  // ⚠️ ONE garment is enough to define the range, and this matters for a
  // one-piece look: a dress plus shoes has a single garment, and requiring two
  // sent it down the fallback path where the tolerance did not apply at all.
  // Nothing but ranged items has no range to sit outside of.
  if (!garments.length) return formalityCoherence(items.map(fOf));

  const lo = Math.min(...garments.map(fOf));
  const hi = Math.max(...garments.map(fOf));
  let spread = hi - lo;

  for (const i of ranged) {
    const f = fOf(i);
    // Distance outside the garment range, forgiven up to the tolerance.
    const outside = f > hi ? f - hi : f < lo ? lo - f : 0;
    spread = Math.max(spread, hi - lo + Math.max(0, outside - RANGED_TOLERANCE));
  }
  return Math.max(0, 1 - spread / 4);
}

/**
 * One patterned piece is a statement; two are an argument.
 *
 * Counts non-solid pieces: 0 or 1 is clean, each additional one costs. Floored
 * well above zero because a wardrobe of patterned shirts must still be
 * dressable — the same rule every other signal in this file follows.
 */
export function patternHarmony(patterns: (string | null | undefined)[]): number {
  const loud = patterns.filter((p) => p && p !== "solid").length;
  return loud <= 1 ? 1 : Math.max(0.3, 1 - (loud - 1) * 0.35);
}

/**
 * A watch is worn unless it actively does not suit.
 *
 * ⚠️ **This is a REWARD, and the penalty half already existed.** The product
 * owner's rule: "for a man it almost always suits, maybe in several outfits not
 * — with a dress this watch doesn't fit, and we don't have another one, so we
 * wouldn't give that watch." The dropping half is `formalityCoherenceOf` above,
 * which still charges a watch that sits two steps outside the garments' range;
 * this only makes a watch that DOES suit preferred over the bare twin, which
 * the builder always offers alongside it.
 *
 * ⚠️ **Not keyed on gender**, deliberately, and it does not need to be. The
 * outcome the owner described falls out of formality: a f3 steel watch is free
 * against f2 casual and f3 smart, and costs 0.0662 against a f5 evening look —
 * whether that look is a dress or a tuxedo. A gender switch would get the
 * tuxedo wrong.
 *
 * ⚠️ Deliberately small. Measured: a suitable watch moves the final score about
 * +0.005, which is enough to beat an identical bare outfit, while an unsuitable
 * one still loses 0.066. The reward must never be able to drag a clashing watch
 * into a look.
 *
 * Returns `null` — not 0 — when no watch is present, so an outfit without one
 * claims no weight and is not penalised for the absence. Owning no watch must
 * cost nothing.
 */
const WRISTWEAR = /watch/i;

export function wristwearBonus(
  items: { subcategory?: string | null }[],
): number | null {
  return items.some((i) => i.subcategory && WRISTWEAR.test(i.subcategory)) ? 1 : null;
}

/**
 * How well the combo suits today, on whichever evidence exists.
 *
 * Climate — "does this suit the weather?" — is ONE term, not two. Season and
 * warmth answer the same question with different evidence, so they share
 * `WEIGHTS.climate` instead of competing for the score, and weather gets a
 * single, better-informed vote. Future weather work (wind, humidity) belongs
 * inside this term, not beside it.
 *
 * Returns null when there is neither a temperature nor a season, so the caller
 * can drop the term entirely rather than fold in a meaningless 0.5.
 */
function climateFit(items: ScoreItem[], ctx: Ctx): number | null {
  const warmth = ctx.tempC == null ? null : warmthFit(items, ctx.tempC);
  const season = ctx.season ? seasonFit(items, ctx.season) : null;
  if (warmth == null) return season;
  if (season == null) return warmth;
  return WARMTH_SHARE * warmth + (1 - WARMTH_SHARE) * season;
}

/** A signal's declared weight and what it scored, or null when it has no evidence. */
type Term = { weight: number; value: number | null };

export function scoreCombo(items: ScoreItem[], ctx: Ctx): number {
  const colors = items.flatMap((i) => i.colors);

  // ⚠️ `dna` was here and was ALWAYS ZERO. `style_tags` had no DB column and no
  // producer anywhere in the repo, so `dnaHits` never exceeded 0 — a constant
  // 15% removed from every outfit, discriminating nothing. Deleted rather than
  // revived: the aesthetic already reaches the model through the rerank prompt,
  // and a deterministic aesthetic signal needs a real producer behind it, which
  // is its own piece of work.
  //
  // ⚠️ The weight is NOT redistributed here. With Task 1's additive budget the
  // term simply stops claiming its share and normalisation absorbs it, which is
  // a uniform rescale and provably cannot reorder anything. Moving the 0.15 to
  // `colour` was measured to reorder the tail — a deliberate reweighting that
  // belongs in its own change where it can be judged on its own evidence.

  // One line per signal. A `null` value means "no evidence" — the term is
  // DROPPED, never folded in as a neutral 0.5, and the rest renormalise over
  // what is left. That is the same contract `colourScore` and `climateFit`
  // already use one level down.
  const terms: Term[] = [
    // ⚠️ Pass the PER-ITEM grouping, not the flattened list: `echoScore` needs
    // to know which garment each colour came from — an accent repeated across
    // two garments is an echo, the same accent listed twice on one garment is
    // not.
    //
    // ⚠️ Accents go in a SECOND argument, not concatenated into `colors`.
    // `colourScore` routes them to the echo term alone; a logo must not spend
    // one of the three slots the harmony ceiling counts, nor answer for the
    // garment in the pairing and temperature tables. `leanScore` below reads
    // the dominant colours only, for the same reason — a shoelace should not
    // satisfy a "lean into navy".
    //
    // ⚠️ A HARDWARE item contributes no dominant colours. A steel watch case is
    // not a garment hue: counted as one it spent a slot against the three-colour
    // ceiling, so adding a well-matched watch measurably LOWERED an outfit
    // (0.9010 -> 0.8930 on an all-neutral look). The research: "silver hardware
    // is normally not garment hue", and accessories are "structured style
    // objects rather than extra colours". Metal gets its own signal instead —
    // see ./styling/metal.ts.
    //
    // ⚠️ Its ACCENT still counts. A navy watch dial picking up a navy knit is a
    // real echo, which the research rates low-medium rather than zero — so the
    // body colour is dropped and the accent survives, exactly the split the
    // dominant/accent routing above already makes for garments.
    {
      weight: WEIGHTS.colour,
      value: colourScore(
        items.map((i) => (isHardware(i.material, i.colors) ? [] : i.colors)),
        // ⚠️ A METAL accent leaves too. Dropping only the metal item's body
        // colour orphaned the bag's silver buckle: with the bracelet's silver
        // gone there was nothing left for it to echo, so it scored 0.35 as an
        // unsupported loud colour — WORSE than the 0.5 the same bag gets with no
        // accent at all. Metal answers to `metalCoordination`, on both sides.
        items.map((i) => (accentMetalTone(i.accent_color) ? null : i.accent_color)),
      ),
    },
    { weight: WEIGHTS.coherence, value: formalityCoherenceOf(items) },
    { weight: WEIGHTS.pattern, value: patternHarmony(items.map((i) => i.pattern)) },
    // Metal is a PREFERENCE: one visible family is the safe default, a mix is a
    // style choice rather than a defect. Weighted well under `coherence` (0.3)
    // so a metal clash can never outrank a formality clash — the research ranks
    // metal consistency below register. Null below two metal elements, which is
    // most outfits, so a wardrobe without jewellery is untouched.
    { weight: WEIGHTS.metal, value: metalCoordination(items) },
    { weight: WEIGHTS.wristwear, value: wristwearBonus(items) },
    // ⚠️ Hardware passes [] for colours here too, exactly as it does to
    // `colourScore` — a steel watch is not a value block and must not be able
    // to flatten or separate an outfit.
    // ⚠️ SHOES DO NOT VOTE when the look is built on a one-piece. With separates,
    // the contrast between top and bottom IS the outfit's structure. With a
    // dress, the dress carries the colour story and the shoe is meant to recede
    // — the research's advice is a neutral or nude shoe precisely so it
    // disappears. Judging a dress against its shoe inverted the ranking:
    // measured, a navy dress scored 0.7681 with black heels (perfect formality,
    // "poor" contrast) against 0.7823 with white sneakers (two formality steps
    // out, "good" contrast), so the engine recommended trainers with a formal
    // dress. A coat still counts, because a camel coat over a black dress is a
    // real relationship the research names.
    // ⚠️ The one asymmetric colour signal. Every other reads a set; this one
    // asks which garment is on top, because `pairingRating` sorts its key and
    // cannot tell `navy+white` from `white+navy`.
    { weight: WEIGHTS.direction, value: valueDirection(items) },
    // ⚠️ Null, never 0, when nothing matches. The table lists outfits the
    // research wrote down, not a definition of every good outfit — a miss must
    // stay silent rather than become a penalty on the many fine combinations
    // nobody published.
    { weight: WEIGHTS.canonical, value: canonicalTrio(items) },
    {
      weight: WEIGHTS.separation,
      value: (() => {
        const hasOnePiece = items.some((i) => i.category === "One-piece");
        const voting = items.filter((i) => !(hasOnePiece && i.category === "Shoes"));
        return visualSeparation(
          voting.map((i) => (isHardware(i.material, i.colors) ? [] : i.colors)),
          voting.map((i) => i.texture),
        );
      })(),
    },
    { weight: WEIGHTS.lean, value: ctx.lean?.length ? leanScore(colors, ctx.lean) : null },
    { weight: WEIGHTS.climate, value: climateFit(items, ctx) },
  ];

  const claimed = terms.filter((t): t is Term & { value: number } => t.value != null);
  const total = claimed.reduce((sum, t) => sum + t.weight, 0);
  if (!total) return 0;
  const scored = claimed.reduce((sum, t) => sum + t.weight * t.value, 0);
  return Math.min(1, Math.max(0, scored / total));
}
