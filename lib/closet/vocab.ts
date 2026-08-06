import {
  TagSchema,
  MATERIALS as AI_MATERIALS,
  TEXTURES as AI_TEXTURES,
  COLOR_NAMES,
} from "@/lib/ai/tagging-schema";

/**
 * The single source for every closet vocabulary.
 *
 * These lists were previously copy-pasted into confirm-form.tsx and
 * item-detail.tsx, and neither copy matched what the tagger was told to emit —
 * so the AI could write a material the edit screen could not offer back.
 * Categories and seasons are DERIVED from TagSchema so drift is impossible;
 * the rest are defined here and consumed by the schema.
 */

export const CATEGORIES = TagSchema.shape.category.options;
export const SEASONS = TagSchema.shape.seasons.element.options;

export const FORMALITY_LABEL = [
  "",
  "Very casual",
  "Casual",
  "Smart casual",
  "Business",
  "Formal",
] as const;

/**
 * Materials and textures are DEFINED in `lib/ai/tagging-schema.ts` and
 * re-exported here, not the other way round: this module derives CATEGORIES and
 * SEASONS from `TagSchema`, so importing vocab from the schema would be a
 * cycle. Every UI surface still reads them from here, so there is one import
 * path for the whole closet vocabulary.
 */
export const MATERIALS = AI_MATERIALS;
export const TEXTURES = AI_TEXTURES;
export { COLOR_NAMES };

/** The only colour values that may reach the database, on either write path. */
export type ColorName = (typeof COLOR_NAMES)[number];

export const PATTERNS = ["solid", "striped", "check", "print", "other"] as const;

/**
 * The palette the swatch picker offers, and the ONLY colours the tagger may
 * emit — `TagSchema.colors` is `z.enum(COLOR_NAMES)`, so a colour the generator
 * cannot place can no longer reach the database.
 *
 * `neutral` drives `colorHarmonyScore`, which gives an outfit ONE accent for
 * free and charges 0.25 for each one after it. That asymmetry decides the
 * borderline cases: mislabelling a foundation colour as an accent spends the
 * free allowance and penalises an outfit that is actually restrained, whereas
 * mislabelling an accent as neutral only fails to penalise. So the foundations
 * of a menswear wardrobe — navy, brown, camel, tan, denim — count as neutral,
 * and everything that reads as a deliberate colour choice does not.
 *
 * ⚠️ `camel` and `denim` are the two judgement calls. A camel coat is
 * foundational, not a statement, and the design's own example is "camel knit /
 * grey trousers / brown loafers"; indigo denim behaves as a neutral in every
 * casual outfit it appears in. `silver` and `gold` stay accents: as garment
 * colours they are deliberate, and as hardware they rarely reach the tag set.
 */
export const COLORS: readonly { name: ColorName; hex: string; neutral: boolean }[] = [
  // Achromatic
  { name: "black", hex: "#141414", neutral: true },
  { name: "charcoal", hex: "#36353a", neutral: true },
  { name: "grey", hex: "#8a8a8f", neutral: true },
  { name: "silver", hex: "#c0c0c8", neutral: false },
  { name: "white", hex: "#f4f1ea", neutral: true },
  { name: "ivory", hex: "#efe8dc", neutral: true },
  { name: "cream", hex: "#ece3d2", neutral: true },
  // Warm neutrals / earths
  { name: "stone", hex: "#cabfae", neutral: true },
  { name: "sand", hex: "#e0d3b4", neutral: true },
  { name: "beige", hex: "#d5c4a8", neutral: true },
  { name: "taupe", hex: "#9c8f82", neutral: true },
  { name: "khaki", hex: "#b3a475", neutral: true },
  { name: "camel", hex: "#b08d57", neutral: true },
  { name: "tan", hex: "#a9784f", neutral: true },
  { name: "caramel", hex: "#96652f", neutral: true },
  { name: "chocolate", hex: "#4a3225", neutral: true },
  { name: "brown", hex: "#6b4b32", neutral: true },
  // Blues
  { name: "navy", hex: "#242f45", neutral: true },
  { name: "indigo", hex: "#35406b", neutral: true },
  { name: "denim", hex: "#5a7896", neutral: true },
  { name: "blue", hex: "#3d5a80", neutral: false },
  { name: "sky", hex: "#8fb3cf", neutral: false },
  { name: "teal", hex: "#2f6b6b", neutral: false },
  // Greens
  { name: "olive", hex: "#5e7256", neutral: true },
  { name: "sage", hex: "#9aa88f", neutral: false },
  { name: "forest", hex: "#2f4a35", neutral: false },
  { name: "green", hex: "#3f6b4a", neutral: false },
  { name: "mint", hex: "#a8c9b4", neutral: false },
  // Reds / pinks
  { name: "burgundy", hex: "#5e2733", neutral: false },
  { name: "maroon", hex: "#6e2f2f", neutral: false },
  { name: "red", hex: "#a8342f", neutral: false },
  { name: "rust", hex: "#b86a47", neutral: false },
  { name: "terracotta", hex: "#c07a55", neutral: false },
  { name: "coral", hex: "#cf7f6a", neutral: false },
  { name: "pink", hex: "#d0a0a0", neutral: false },
  // Purples
  { name: "purple", hex: "#5b4b7a", neutral: false },
  { name: "lavender", hex: "#a99ac0", neutral: false },
  { name: "plum", hex: "#4f2f45", neutral: false },
  // Yellows / oranges
  { name: "mustard", hex: "#c39a2b", neutral: false },
  { name: "yellow", hex: "#d6b756", neutral: false },
  { name: "gold", hex: "#c9a227", neutral: false },
  { name: "orange", hex: "#c8703a", neutral: false },
];

export function colorHex(name: string): string | undefined {
  const n = name.toLowerCase();
  return COLORS.find((c) => c.name === n)?.hex;
}
