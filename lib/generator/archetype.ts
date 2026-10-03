import { isGraphicTee } from "./nogos";

/**
 * The quiz's style answer as tag evidence (quiz part 3). Rows: docs/research/fitcheck-archetype-signals-2026-10-03.csv.
 * Signature = plus, off-style = minus; compatible rows and default tags (Regular fit, no branding) are no opinion.
 */
export type ArchetypeId = "Old Money" | "Smart Casual" | "Preppy" | "Streetwear";

export type ArchetypeItem = {
  category: string;
  subcategory?: string | null;
  fit?: string | null;
  branding?: string | null;
  distressing?: string | null;
  bulk?: string | null;
  material?: string | null;
  texture?: string | null;
  pattern?: string | null;
  formality?: number | null;
};

type Mark = (i: ArchetypeItem) => boolean;

const CLOTHING = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);
/** A whole-word subcategory match, limited to the categories where the word means the research's garment. */
const named = (re: RegExp, categories: readonly string[]): Mark => (i) => categories.includes(i.category) && re.test(i.subcategory ?? "");
const cut = (fit: string): Mark => (i) => CLOTHING.has(i.category) && i.fit === fit;
const chunkyShoe: Mark = (i) => i.category === "Shoes" && i.bulk === "Chunky";
const loafers = named(/\bloafers?\b/i, ["Shoes"]);
const blazer = named(/\bblazers?\b/i, ["Tops", "Outerwear"]);

export const ARCHETYPE_MARKS: Record<ArchetypeId, { signature: readonly Mark[]; off: readonly Mark[] } | null> = {
  "Old Money": {
    signature: [
      cut("Tailored"),
      loafers,
      blazer,
      named(/\bshirt[- ]?dress(es)?\b/i, ["One-piece"]),
      (i) => i.category === "Tops" && i.material === "Silk" && /\bblouses?\b/i.test(i.subcategory ?? ""),
    ],
    off: [
      (i) => i.branding === "Large",
      cut("Oversized"),
      (i) => i.distressing === "Ripped",
      chunkyShoe,
      // The research's "Gym trainers" (filed under bulk): athletic footwear, formality 1.
      (i) => i.category === "Shoes" && i.formality != null && i.formality <= 1,
    ],
  },
  // Preppy and Streetwear have no off-style rows in the research: they only lift their own looks.
  Preppy: {
    signature: [
      // A "polo neck" is a turtleneck, not a polo shirt.
      named(/\b(oxford|rugby)\b|\bpolo\b(?![- ]?necks?\b)/i, ["Tops"]),
      (i) => i.texture === "Cable knit" || /\bcable[- ]?knit\b/i.test(i.subcategory ?? ""),
      named(/\bchinos?\b/i, ["Bottoms"]),
      named(/\b(loafers?|boat shoes?)\b/i, ["Shoes"]),
      (i) => /\bargyle\b/i.test(i.subcategory ?? ""),
      named(/\bpleated\b.*\bskirts?\b/i, ["Bottoms", "One-piece"]),
      blazer,
    ],
    off: [],
  },
  Streetwear: {
    signature: [
      named(/\bhoodies?\b/i, ["Tops", "Outerwear"]),
      named(/\bcargos?\b/i, ["Bottoms"]),
      isGraphicTee,
      named(/\b(sneakers?|trainers?)\b/i, ["Shoes"]),
      cut("Oversized"),
      chunkyShoe,
    ],
    off: [],
  },
  // A dress-code middle with no exclusive signals; the dress-code band already expresses it (spec D4).
  "Smart Casual": null,
};

const isArchetype = (a: string): a is ArchetypeId => Object.hasOwn(ARCHETYPE_MARKS, a);

/** Share of the look's style marks that agree with the answer; `null` = no opinion, so the term claims no weight. */
export function archetypeScore(items: readonly ArchetypeItem[], archetype: string | null | undefined): number | null {
  if (!archetype || !isArchetype(archetype)) return null;
  const marks = ARCHETYPE_MARKS[archetype];
  if (!marks) return null;
  let plus = 0;
  let minus = 0;
  for (const item of items) {
    plus += marks.signature.filter((mark) => mark(item)).length;
    minus += marks.off.filter((mark) => mark(item)).length;
  }
  return plus + minus ? plus / (plus + minus) : null;
}
