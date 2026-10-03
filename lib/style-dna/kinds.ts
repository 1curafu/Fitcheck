/**
 * A garment's kind, from the tagger's free-text subcategory: translatable labels for "your formula".
 * Ordered whole-word rules per category; the first match wins and the category's fallback catches the rest.
 */
export const PIECE_KINDS = [
  "tee", "shirt", "polo", "knit", "hoodie", "blouse", "top", "jeans", "chinos", "trousers", "shorts", "skirt",
  "dress", "jumpsuit", "sneakers", "loafers", "boots", "heels", "flats", "sandals", "shoes", "blazer", "jacket", "coat",
] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

type KindItem = { category: string; subcategory?: string | null; material?: string | null };
type Rule = readonly [PieceKind, (i: KindItem) => boolean];
const says = (re: RegExp) => (i: KindItem) => re.test(i.subcategory ?? "");

const RULES: Record<string, { rules: readonly Rule[]; fallback: PieceKind }> = {
  Tops: {
    rules: [
      ["hoodie", says(/\b(hoodies?|sweatshirts?)\b/i)],
      // A "polo neck" is a turtleneck, so it falls through to knit.
      ["polo", says(/\bpolos?\b(?![- ]?necks?\b)/i)],
      ["tee", says(/\b(t-?shirts?|tees?|tank tops?)\b/i)],
      ["blouse", says(/\bblouses?\b/i)],
      ["knit", says(/\bpolo[- ]?necks?\b|\b(knits?|knitwear|cable[- ]?knit|sweaters?|jumpers?|cardigans?|pullovers?|turtlenecks?|roll[- ]?necks?)\b/i)],
      ["shirt", says(/\bshirts?\b/i)],
      ["blazer", says(/\bblazers?\b/i)],
    ],
    fallback: "top",
  },
  Bottoms: {
    rules: [
      ["jeans", (i) => i.material === "Denim" || /\bjeans\b/i.test(i.subcategory ?? "")],
      ["chinos", says(/\bchinos?\b/i)],
      ["shorts", says(/\b(shorts|bermudas?)\b/i)],
      ["skirt", says(/\bskirts?\b/i)],
    ],
    fallback: "trousers",
  },
  "One-piece": { rules: [["jumpsuit", says(/\b(jumpsuits?|playsuits?|rompers?|overalls|dungarees)\b/i)]], fallback: "dress" },
  Outerwear: {
    rules: [["blazer", says(/\bblazers?\b/i)], ["coat", says(/(coats?|parkas?|trench)\b/i)]],
    fallback: "jacket",
  },
  Shoes: {
    rules: [
      ["sneakers", says(/\b(sneakers?|trainers?|runners?)\b/i)],
      ["loafers", says(/\b(loafers?|moccasins?)\b/i)],
      ["heels", says(/\b(heels?|pumps?|slingbacks?|stilettos?)\b/i)],
      ["flats", says(/\b(flats?|ballerinas?)\b|\bballet\b/i)],
      ["sandals", says(/\b(sandals?|slides?|mules?|flip[- ]?flops?|espadrilles?)\b/i)],
      ["boots", says(/\bboots?\b/i)],
    ],
    fallback: "shoes",
  },
};

export function pieceKind(item: KindItem): PieceKind | null {
  const table = RULES[item.category];
  if (!table) return null;
  return table.rules.find(([, matches]) => matches(item))?.[0] ?? table.fallback;
}
