import {
  TagSchema,
  MATERIALS as AI_MATERIALS,
  TEXTURES as AI_TEXTURES,
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

export const PATTERNS = ["solid", "striped", "check", "print", "other"] as const;

/**
 * The palette the swatch picker offers. Names match what the tagger emits and
 * what `lib/generator/color.ts` groups into families — a colour the generator
 * cannot place is a colour that silently scores nothing.
 */
export const COLORS = [
  { name: "black", hex: "#141414" },
  { name: "charcoal", hex: "#36353a" },
  { name: "grey", hex: "#8a8a8f" },
  { name: "white", hex: "#f4f1ea" },
  { name: "cream", hex: "#ece3d2" },
  { name: "stone", hex: "#cabfae" },
  { name: "beige", hex: "#d5c4a8" },
  { name: "camel", hex: "#b08d57" },
  { name: "tan", hex: "#a9784f" },
  { name: "brown", hex: "#6b4b32" },
  { name: "rust", hex: "#b86a47" },
  { name: "burgundy", hex: "#5e2733" },
  { name: "olive", hex: "#5e7256" },
  { name: "green", hex: "#3f6b4a" },
  { name: "navy", hex: "#242f45" },
  { name: "blue", hex: "#3d5a80" },
  { name: "denim", hex: "#5a7896" },
  { name: "pink", hex: "#d0a0a0" },
  { name: "yellow", hex: "#d6b756" },
  { name: "silver", hex: "#c0c0c8" },
  { name: "gold", hex: "#c9a227" },
] as const;

export function colorHex(name: string): string | undefined {
  const n = name.toLowerCase();
  return COLORS.find((c) => c.name === n)?.hex;
}
