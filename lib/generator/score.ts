import { colorHarmonyScore } from "./color";

export type ScoreItem = {
  category: string;
  colors: string[];
  formality: number | null;
  style_tags?: string[];
};
export type Ctx = { aesthetic: string[]; band: [number, number] };

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
  return Math.min(1, 0.45 * harmony + 0.35 * coherence + 0.2 * dna);
}
