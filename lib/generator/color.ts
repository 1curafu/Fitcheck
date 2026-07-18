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
