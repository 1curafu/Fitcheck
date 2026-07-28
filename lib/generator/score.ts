import { colorHarmonyScore, leanScore } from "./color";
import { seasonFit } from "./season";

export type ScoreItem = {
  category: string;
  colors: string[];
  formality: number | null;
  style_tags?: string[];
  seasons?: string[];
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
};

/**
 * How much of the score the colour lean is allowed to claim when one is asked
 * for. High enough to reorder the top 20 decisively, low enough that a combo
 * missing the colour still beats an incoherent one that has it — the lean is a
 * preference, never an eliminator.
 */
const LEAN_WEIGHT = 0.3;

/**
 * The same bargain for season. Slightly lower than the lean because a lean is an
 * explicit request the user just made, while season is inferred from the month.
 * Both together cap at 0.5, so coherence and colour harmony always keep half the
 * score — an off-season combo that actually works still beats an in-season mess.
 */
const SEASON_WEIGHT = 0.2;

/** 1.0 = identical formality; falls off with spread. */
export function formalityCoherence(formalities: number[]): number {
  const f = formalities.filter((x) => typeof x === "number");
  if (f.length < 2) return 1;
  const spread = Math.max(...f) - Math.min(...f);
  return Math.max(0, 1 - spread / 4); // spread of 4 (1↔5) → 0
}

export function scoreCombo(items: ScoreItem[], ctx: Ctx): number {
  const colors = items.flatMap((i) => i.colors);
  const harmony = colorHarmonyScore(colors);
  const coherence = formalityCoherence(items.map((i) => i.formality ?? 3));
  const dnaHits = items.filter((i) => i.style_tags?.some((t) => ctx.aesthetic.includes(t))).length;
  const dna = items.length ? dnaHits / items.length : 0;
  const base = 0.45 * harmony + 0.35 * coherence + 0.2 * dna;

  // Each preference claims its weight only when it applies, so with neither one
  // set the score is byte-identical to what it was before either landed.
  const wl = ctx.lean?.length ? LEAN_WEIGHT : 0;
  const ws = ctx.season ? SEASON_WEIGHT : 0;
  return Math.min(
    1,
    base * (1 - wl - ws) + wl * leanScore(colors, ctx.lean ?? []) + ws * seasonFit(items, ctx.season),
  );
}
