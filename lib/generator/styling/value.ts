import { colorHex } from "@/lib/closet/vocab";

/**
 * Whether an outfit's pieces read as separate — by value, or failing that by
 * surface. Pairwise colour averaging cannot see a muddy trio, because every
 * pair in one is individually pleasant.
 */

/** WCAG relative luminance, 0 (black) .. 1 (white). */
export function relativeLuminance(hex: string): number | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(h.slice(0, 2), 16));
  const g = channel(parseInt(h.slice(2, 4), 16));
  const b = channel(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio, 1 (identical) .. 21 (black on white).
 *
 * ⚠️ RATIO, never the difference between luminances. `camel/beige/camel` spans
 * 0.2749 and `camel/black/black` spans 0.2827, so a difference cannot tell the
 * muddy trio from the one the research endorses. As ratios: 1.81 and 5.96.
 */
export function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG's large-text threshold — the standard's own "distinguishable at a glance". */
export const CLEAR_SEPARATION = 3;

/**
 * ⚠️ A garment's value is its MOST DOMINANT colour, not its darkest. The
 * tagging prompt writes `colors` "most-dominant first", so the first entry is
 * the block the eye reads; taking the darkest made a two-tone `["white","sky"]`
 * sneaker stop scoring like the same shoe with a sky accent.
 */
function garmentValue(colours: readonly string[]): number | null {
  for (const c of colours) {
    const hex = colorHex(c.trim().toLowerCase());
    const lum = hex ? relativeLuminance(hex) : null;
    if (lum != null) return lum;
  }
  return null;
}

/**
 * Whether every garment carrying a colour wears the SAME one.
 *
 * ⚠️ One colour repeated is a monochrome column — a choice. Several colours that
 * nearly match are an accident. Contrast alone cannot tell them apart: all-black
 * and white/cream/beige both sit at the bottom of the ratio, and scored 0.7769
 * against 0.7780 before this distinction existed.
 */
function isMonochrome(perItemColours: readonly (readonly string[])[]): boolean {
  const dominants = perItemColours
    .map((c) => c.find((x) => colorHex(x.trim().toLowerCase()))?.trim().toLowerCase())
    .filter((c): c is string => !!c);
  return dominants.length >= 2 && new Set(dominants).size === 1;
}

/** How clearly the garments separate by value, or null with nothing to compare. */
export function valueContrast(perItemColours: readonly (readonly string[])[]): number | null {
  if (isMonochrome(perItemColours)) return null;
  const values = perItemColours.map(garmentValue).filter((v): v is number => v != null);
  if (values.length < 2) return null;

  let strongest = 1;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      strongest = Math.max(strongest, contrastRatio(values[i], values[j]));
    }
  }
  return Math.min(1, Math.max(0, (strongest - 1) / (CLEAR_SEPARATION - 1)));
}

/**
 * How much visual interest the surfaces carry.
 *
 * ⚠️ `"Flat"` is absence, not a texture — the tagger's default, treated the way
 * `patternHarmony` treats `"solid"`.
 *
 * Full marks at TWO distinct textures: a pairing is the smallest arrangement
 * that reads as chosen rather than incidental, the same reason `patternHarmony`
 * allows one loud piece and charges the second.
 */
export function textureVariety(textures: readonly (string | null | undefined)[]): number | null {
  const distinct = new Set(
    textures.map((t) => t?.trim().toLowerCase()).filter((t): t is string => !!t && t !== "flat"),
  );
  if (!textures.some((t) => t != null)) return null;
  return Math.min(1, distinct.size / 2);
}

/**
 * Separation by value OR by surface, or null when there is nothing to flag.
 *
 * `max`, not a sum: an outfit already separated by value gains nothing from
 * texture, and a tonal column is carried entirely by it.
 *
 * ⚠️ Returns null once separation is clear, rather than 1. Most outfits
 * separate cleanly, so scoring them made this near-constant — and a constant
 * still reorders looks, because combos claim different weight SETS and the
 * additive budget is sensitive to the denominator. It reordered the top two
 * looks while having no opinion about either.
 */
export function visualSeparation(
  perItemColours: readonly (readonly string[])[],
  textures: readonly (string | null | undefined)[],
): number | null {
  const value = valueContrast(perItemColours);
  // No colour verdict — a monochrome column, or too few garments — means there
  // is nothing here to fault. Texture may RESCUE a weak contrast; it must never
  // manufacture a penalty on its own, or a deliberate all-black outfit in flat
  // weaves would be charged for it.
  if (value == null) return null;
  const separation = Math.max(value, textureVariety(textures) ?? 0);
  return separation >= 1 ? null : separation;
}
