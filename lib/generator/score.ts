import { colorHarmonyScore, leanScore } from "./color";
import { seasonFit } from "./season";
import { warmthFit } from "./texture";

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
 * How much of the score the colour lean is allowed to claim when one is asked
 * for. High enough to reorder the top 20 decisively, low enough that a combo
 * missing the colour still beats an incoherent one that has it — the lean is a
 * preference, never an eliminator.
 */
const LEAN_WEIGHT = 0.3;

/**
 * Climate — "does this suit the weather?" — is ONE term, not two.
 *
 * Season and warmth answer the same question with different evidence, so they
 * share a weight instead of competing for the score. Adding warmth as a third
 * independent preference would have pushed the total past 0.5 and squeezed
 * colour, formality and DNA below half whenever a Refine lean was also active;
 * merging keeps the budget bounded by construction and gives weather a single,
 * better-informed vote. Future weather work (wind, humidity) belongs inside
 * this term, not beside it.
 *
 * Slightly above the 0.2 season alone used to carry — the term now reads a real
 * temperature rather than only the month — and still low enough that an
 * off-season combo which actually works beats an in-season mess.
 */
const CLIMATE_WEIGHT = 0.28;

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

export function scoreCombo(items: ScoreItem[], ctx: Ctx): number {
  const colors = items.flatMap((i) => i.colors);
  const harmony = colorHarmonyScore(colors);
  const coherence = formalityCoherence(items.map((i) => i.formality ?? 3));
  const dnaHits = items.filter((i) => i.style_tags?.some((t) => ctx.aesthetic.includes(t))).length;
  const dna = items.length ? dnaHits / items.length : 0;
  const pattern = patternHarmony(items.map((i) => i.pattern));
  const base = 0.4 * harmony + 0.3 * coherence + 0.15 * dna + 0.15 * pattern;

  // Each preference claims its weight only when it applies, so with neither one
  // set the score is byte-identical to what it was before either landed.
  const climate = climateFit(items, ctx);
  const wl = ctx.lean?.length ? LEAN_WEIGHT : 0;
  const wc = climate == null ? 0 : CLIMATE_WEIGHT;
  return Math.min(
    1,
    base * (1 - wl - wc) + wl * leanScore(colors, ctx.lean ?? []) + wc * (climate ?? 0),
  );
}
