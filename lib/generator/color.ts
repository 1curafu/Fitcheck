import { COLORS } from "@/lib/closet/vocab";

/**
 * Derived from the palette, never hand-listed.
 *
 * The old literal set carried `khaki`, `ecru` and `gray` — none of which the
 * picker can produce — and omitted `camel`, `denim` and `silver`, which it can.
 * With `TagSchema.colors` now a `z.enum`, the palette is the only vocabulary
 * that exists, so both lists here are computed from it and a test pins that
 * every name they contain is a real colour.
 */
export const NEUTRAL_NAMES: string[] = COLORS.filter((c) => c.neutral).map((c) => c.name);

const NEUTRALS = new Set<string>(NEUTRAL_NAMES);

export function isNeutral(color: string): boolean {
  return NEUTRALS.has(color.trim().toLowerCase());
}

/** 1.0 = all neutral; each accent beyond the first costs 0.25. */
export function colorHarmonyScore(colors: string[]): number {
  const accents = colors.filter((c) => !isNeutral(c)).length;
  const penalty = Math.max(0, accents - 1) * 0.25;
  return Math.min(1, Math.max(0, 1 - penalty));
}

/**
 * The Refine "Lean into" palette — the five swatches in `refine-sheet.tsx`.
 *
 * The swatches are families, not literal tag values: `neutral` and `dark` are
 * categories, and matching a swatch id verbatim would find nothing for them.
 *
 * These lists used to carry ~23 free-form names (sand, oatmeal, taupe, cognac,
 * terracotta, cobalt, sage, onyx…) because Haiku emitted colours off any
 * vocabulary. That was the right answer while `colors` was `z.string()`; now the
 * schema is a `z.enum` over the palette, so any name outside it is dead weight
 * that can never match. A test asserts every member is a real palette colour.
 *
 * NOT a partition, on purpose. Families overlap (`tan` is both neutral and
 * camel), and `pink` and `yellow` belong to none — leaning on "camel" simply
 * does not favour a pink shirt, which is correct. `leanScore` is a weighted
 * term, never a filter, so an unfamilied colour is not excluded from anything.
 */
export const COLOR_FAMILIES: Record<string, string[]> = {
  neutral: ["white", "ivory", "cream", "stone", "sand", "beige", "taupe", "grey", "silver"],
  camel: ["camel", "tan", "caramel", "chocolate", "brown", "rust", "terracotta", "gold"],
  navy: ["navy", "indigo", "denim", "blue", "sky", "teal"],
  olive: ["olive", "khaki", "sage", "forest", "green", "mint"],
  dark: ["black", "charcoal", "burgundy", "maroon", "plum"],
};

export function inFamily(color: string, family: string): boolean {
  return COLOR_FAMILIES[family]?.includes(color.trim().toLowerCase()) ?? false;
}

/**
 * How well a combo answers the user's "Lean into" picks: the fraction of the
 * requested families that appear somewhere in the outfit.
 *
 * Returns 1 for an empty request so callers can score unconditionally — asking
 * for nothing is never a penalty.
 */
export function leanScore(colors: string[], families: string[]): number {
  if (!families.length) return 1;
  const hits = families.filter((f) => colors.some((c) => inFamily(c, f))).length;
  return hits / families.length;
}
