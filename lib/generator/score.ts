import { colorHarmonyScore, leanScore } from "./color";

export type ScoreItem = {
  category: string;
  colors: string[];
  formality: number | null;
  style_tags?: string[];
};
export type Ctx = {
  aesthetic: string[];
  band: [number, number];
  /** Refine "Lean into" colour families. Empty = no preference. */
  lean?: string[];
};

/**
 * How much of the score the colour lean is allowed to claim when one is asked
 * for. High enough to reorder the top 20 decisively, low enough that a combo
 * missing the colour still beats an incoherent one that has it — the lean is a
 * preference, never an eliminator.
 */
const LEAN_WEIGHT = 0.3;

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

  // With no lean the weight is 0, so scoring is byte-identical to before.
  const w = ctx.lean?.length ? LEAN_WEIGHT : 0;
  return Math.min(1, base * (1 - w) + w * leanScore(colors, ctx.lean ?? []));
}
