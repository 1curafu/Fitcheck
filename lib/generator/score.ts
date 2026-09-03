import { leanScore } from "./color";
import { seasonFit } from "./season";
import { warmthFit } from "./texture";
import { colourScore } from "./styling/colour-score";

export type ScoreItem = {
  category: string;
  colors: string[];
  formality: number | null;
  style_tags?: string[];
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
 * `colour`, `coherence`, `dna` and `pattern` are the always-present terms and
 * sum to 1, so a context with no preferences at all scores exactly as it did
 * before this change.
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
  dna: 0.15,
  pattern: 0.15,
  lean: 0.3,
  climate: 0.28,
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
  const dnaHits = items.filter((i) => i.style_tags?.some((t) => ctx.aesthetic.includes(t))).length;

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
    {
      weight: WEIGHTS.colour,
      value: colourScore(
        items.map((i) => i.colors),
        items.map((i) => i.accent_color),
      ),
    },
    { weight: WEIGHTS.coherence, value: formalityCoherence(items.map((i) => i.formality ?? 3)) },
    { weight: WEIGHTS.dna, value: items.length ? dnaHits / items.length : 0 },
    { weight: WEIGHTS.pattern, value: patternHarmony(items.map((i) => i.pattern)) },
    { weight: WEIGHTS.lean, value: ctx.lean?.length ? leanScore(colors, ctx.lean) : null },
    { weight: WEIGHTS.climate, value: climateFit(items, ctx) },
  ];

  const claimed = terms.filter((t): t is Term & { value: number } => t.value != null);
  const total = claimed.reduce((sum, t) => sum + t.weight, 0);
  if (!total) return 0;
  const scored = claimed.reduce((sum, t) => sum + t.weight * t.value, 0);
  return Math.min(1, Math.max(0, scored / total));
}
