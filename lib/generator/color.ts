const NEUTRALS = new Set([
  "navy", "grey", "gray", "beige", "white", "black", "brown", "cream", "tan", "stone",
  "charcoal", "khaki", "ecru",
]);

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
 * The Refine "Lean into" palette, as FAMILIES of tag words.
 *
 * The swatches are five families, not five literal tag values. Item colours come
 * from Haiku as free-form common names ("charcoal", "beige", "khaki" — see
 * `lib/ai/tag-item.ts`), so matching a swatch id verbatim found almost nothing,
 * and `neutral`/`dark` found *nothing at all* — they are categories, not colours.
 *
 * Families overlap on purpose (tan is both a neutral and a camel); membership is
 * a per-family lookup, not a partition.
 */
export const COLOR_FAMILIES: Record<string, string[]> = {
  neutral: [
    "beige", "cream", "stone", "tan", "ecru", "sand", "oatmeal", "taupe",
    "white", "off-white", "ivory", "grey", "gray", "greige",
  ],
  camel: ["camel", "tan", "caramel", "cognac", "brown", "chocolate", "toffee", "rust", "terracotta"],
  navy: ["navy", "blue", "indigo", "denim", "cobalt", "midnight"],
  olive: ["olive", "khaki", "green", "sage", "forest", "moss", "army"],
  dark: ["black", "charcoal", "graphite", "onyx", "jet"],
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
