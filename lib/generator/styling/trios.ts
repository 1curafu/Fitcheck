import { isNeutral } from "@/lib/generator/color";

/**
 * Documented outfit trios, as `top / bottom / shoes` colours.
 *
 * ⚠️ Every other colour signal in this codebase can only PENALISE — harmony
 * counts accents against a ceiling, separation faults a muddy trio, direction
 * charges an inverted one. None of them can say a combination is actively good,
 * so a merely-inoffensive outfit and a canonical one score the same. This is the
 * table that separates them.
 *
 * ⚠️ Colour families, not exact matches. The research lists "white shirt / navy
 * chinos / brown shoes" and expects it to cover an ivory shirt and tan shoes; a
 * literal lookup would match almost nothing in a real wardrobe. `FAMILY` below
 * is what makes a row reach the outfits it was written about.
 *
 * ⚠️ Sourced rows only. The research separates what it documents from what it
 * extrapolates, and only the documented trios are here. A table of plausible
 * guesses would be this project inventing taste and calling it research.
 */

/**
 * Colours that read as the same choice for the purpose of matching a row.
 *
 * Deliberately coarse. The point is to recognise the SHAPE of a documented
 * outfit — light neutral over dark neutral with a brown shoe — not to grade
 * shades, which the pairing table already does.
 */
const FAMILY: Record<string, string> = {
  white: "light", ivory: "light", cream: "light", stone: "light", sand: "light",
  beige: "light", grey: "light", silver: "light",
  black: "dark", charcoal: "dark",
  navy: "navy", indigo: "navy", denim: "denim", blue: "navy", sky: "sky",
  brown: "brown", chocolate: "brown", caramel: "brown", tan: "tan", camel: "tan",
  khaki: "olive", olive: "olive",
  burgundy: "burgundy", maroon: "burgundy",
};

function familyOf(colour: string): string | null {
  return FAMILY[colour.trim().toLowerCase()] ?? null;
}

type Trio = { top: string; bottom: string; shoes: string; rating: number };

/**
 * `rating` 1 = canonical, 0.8 = good. Taken from the research's own labels; no
 * row is graded here.
 */
const TRIOS: Trio[] = [
  // Smart casual and tailoring — any wardrobe.
  { top: "light", bottom: "navy", shoes: "brown", rating: 1 },
  { top: "sky", bottom: "tan", shoes: "brown", rating: 1 },
  { top: "sky", bottom: "olive", shoes: "brown", rating: 1 },
  { top: "navy", bottom: "light", shoes: "brown", rating: 0.8 },
  { top: "navy", bottom: "light", shoes: "light", rating: 0.8 },
  { top: "light", bottom: "dark", shoes: "light", rating: 1 },
  { top: "dark", bottom: "denim", shoes: "light", rating: 1 },
  { top: "light", bottom: "dark", shoes: "dark", rating: 1 },
  { top: "light", bottom: "olive", shoes: "light", rating: 1 },
  { top: "light", bottom: "brown", shoes: "light", rating: 1 },
  { top: "light", bottom: "navy", shoes: "light", rating: 1 },
  { top: "navy", bottom: "light", shoes: "dark", rating: 0.8 },
  // Colour on the lower half, neutral shoe — the office pattern the research
  // states as a rule: "assigning chroma to the lower garment while keeping shoes
  // neutral should be scored higher".
  { top: "light", bottom: "burgundy", shoes: "dark", rating: 1 },
  { top: "light", bottom: "olive", shoes: "brown", rating: 0.8 },
  { top: "tan", bottom: "dark", shoes: "dark", rating: 1 },
  { top: "light", bottom: "tan", shoes: "light", rating: 1 },
  { top: "dark", bottom: "dark", shoes: "light", rating: 1 },
  { top: "light", bottom: "denim", shoes: "light", rating: 1 },
  { top: "light", bottom: "denim", shoes: "brown", rating: 1 },
  { top: "dark", bottom: "olive", shoes: "light", rating: 0.8 },
];

const INDEX = new Map(TRIOS.map((t) => [`${t.top}|${t.bottom}|${t.shoes}`, t.rating]));

type Piece = { category: string; colors: readonly string[] };

function dominantFamily(items: readonly Piece[], category: string): string | null {
  const item = items.find((i) => i.category === category);
  if (!item) return null;
  for (const c of item.colors) {
    const f = familyOf(c);
    if (f) return f;
  }
  return null;
}

/**
 * How well this outfit matches a documented trio, or `null` when the question
 * does not apply.
 *
 * `null` — not 0 — for an outfit that matches nothing, and that is the whole
 * design: the table REWARDS what it recognises and stays silent otherwise. A
 * miss must not become a penalty, because the table is a list of outfits the
 * research happened to write down, not a definition of every good outfit. Most
 * wardrobes will contain fine combinations nobody published.
 */
export function canonicalTrio(items: readonly Piece[]): number | null {
  // ⚠️ No explicit one-piece guard: a dress look has no Tops or Bottoms, so the
  // lookup below returns null on its own. A guard here was written first and
  // then removed — no mutation could distinguish it, which is the definition of
  // dead code.
  const top = dominantFamily(items, "Tops");
  const bottom = dominantFamily(items, "Bottoms");
  const shoes = dominantFamily(items, "Shoes");
  if (!top || !bottom || !shoes) return null;

  return INDEX.get(`${top}|${bottom}|${shoes}`) ?? null;
}

/** Exposed for tests: every family a row can name must be reachable from a real colour. */
export const TRIO_FAMILIES = new Set(TRIOS.flatMap((t) => [t.top, t.bottom, t.shoes]));
export const KNOWN_FAMILIES = new Set(Object.values(FAMILY));
export { isNeutral };
