import type { ColorName } from "@/lib/closet/vocab";

/**
 * The quiz's palette answer as colours (quiz part 2). The quiz card names three per palette; these are widened to the
 * closest colours the tagger can write, because a closet rarely holds the exact three words.
 *
 * ⚠️ A SOFT preference, never a fence (owner 2026-10-01: "I like neutrals, but I also have good red pieces"). It reaches
 * looks through `paletteScore` at weight 0.1, and the upcoming wardrobe advisor reuses `inPalette` — it must still be free
 * to recommend a red piece to an all-black-and-white closet.
 */
export type PaletteId = "Neutrals" | "Earth" | "Navy" | "Mono";

export const PALETTE_COLORS: Record<PaletteId, readonly ColorName[]> = {
  Neutrals: ["white", "ivory", "cream", "stone", "sand", "beige", "taupe", "grey", "charcoal"],
  Earth: ["camel", "tan", "caramel", "chocolate", "brown", "olive", "khaki", "sage", "rust", "terracotta"],
  Navy: ["navy", "indigo", "denim", "white", "ivory", "cream", "burgundy", "maroon", "grey", "khaki"],
  Mono: ["black", "charcoal", "grey", "silver", "white"],
};

export type PaletteItem = { category: string; colors: readonly string[] };

/** Pieces whose colour reads as the look's palette: garments and shoes, not jewellery or a bag. */
const PIECES = new Set(["Tops", "Bottoms", "One-piece", "Outerwear", "Shoes"]);

const isPalette = (p: string): p is PaletteId => Object.hasOwn(PALETTE_COLORS, p);

export function inPalette(color: string, palette: string): boolean {
  return isPalette(palette) && (PALETTE_COLORS[palette] as readonly string[]).includes(color.trim().toLowerCase());
}

/**
 * How well a look sits in the user's palette. `null` = no opinion (no answer, or nothing to judge), so the term claims
 * no weight and the score is exactly what it would be without it.
 *
 * One out-of-palette piece is FREE — the same rule the colour harmony term uses for a single accent. A red sweater with
 * black trousers and white shoes is the look the owner wants, not a compromise.
 */
export function paletteScore(items: readonly PaletteItem[], palette: string | null | undefined): number | null {
  if (!palette || !isPalette(palette)) return null;
  const mains = items.filter((i) => PIECES.has(i.category) && i.colors.length > 0).map((i) => i.colors[0]);
  if (!mains.length) return null;
  const out = mains.filter((c) => !inPalette(c, palette)).length;
  if (out <= 1) return 1;
  return Math.max(0, 1 - (out - 1) / (mains.length - 1));
}
