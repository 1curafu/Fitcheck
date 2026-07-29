import { z } from "zod";

// MATERIALS and TEXTURES are defined HERE rather than imported from
// lib/closet/vocab.ts: vocab derives CATEGORIES/SEASONS from this schema, so
// importing back would be a cycle. `vocab.ts` re-exports these two, and remains
// the module every UI surface reads from.

/**
 * What the garment is made of.
 *
 * `Merino wool` is listed separately from `Wool` on purpose: they behave
 * differently in heat, and one undifferentiated "wool" is exactly the
 * conflation that makes warmth rules wrong. Warmth is decided by fibre AND
 * construction — see TEXTURES.
 */
export const MATERIALS = [
  "Cotton",
  "Wool",
  "Merino wool",
  "Cashmere",
  "Linen",
  "Silk",
  "Denim",
  "Leather",
  "Suede",
  "Faux leather",
  "Canvas",
  "Corduroy",
  "Tweed",
  "Fleece",
  "Shearling",
  "Down",
  "Polyester",
  "Acrylic",
  "Nylon",
  "Viscose",
  "Modal",
  "Lyocell",
  "Stainless steel",
  "Gold",
  "Silver",
  "Rubber",
  "Other",
] as const;

/**
 * How the fabric is built — knit structure and surface finish. A separate
 * dimension from material: a ribbed merino knit and a flat merino shirt share a
 * material and read completely differently, in both warmth and formality.
 *
 * `Other` is the escape hatch, and the one value deliberately shared with
 * MATERIALS. Without it a required `z.enum` forces the model to mislabel rather
 * than admit it cannot tell from a photo.
 */
export const TEXTURES = [
  "Flat",
  "Ribbed",
  "Cable knit",
  "Waffle",
  "Chunky knit",
  "Fine knit",
  "Brushed",
  "Fleece-back",
  "Twill",
  "Herringbone",
  "Quilted",
  "Pile",
  "Open knit",
  "Terry",
  "Seersucker",
  "Other",
] as const;

// Categories + seasons match the prototype (Title case) so tags line up with
// the closet filters and the generator.
export const TagSchema = z.object({
  category: z.enum(["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Fragrance"]),
  subcategory: z.string().min(1),
  colors: z.array(z.string()).min(1).max(3),
  pattern: z.enum(["solid", "striped", "check", "print", "other"]),
  material: z.enum(MATERIALS),
  texture: z.enum(TEXTURES),
  formality: z.number().int().min(1).max(5),
  seasons: z.array(z.enum(["Spring", "Summer", "Autumn", "Winter"])).min(1),
});
export type Tags = z.infer<typeof TagSchema>;

// Anthropic structured outputs (output_config.format) only accept type/enum/shape
// keywords — NOT the numeric (minimum/maximum/multipleOf), string (min/maxLength),
// or array (min/maxItems/uniqueItems) validation keywords that z.toJSONSchema()
// emits from our .min()/.max()/.int() refinements. Sending them 400s. We strip them
// here; the exact bounds are still enforced after the call by TagSchema.parse().
const UNSUPPORTED_JSON_SCHEMA_KEYWORDS = new Set([
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "minLength", "maxLength",
  "minItems", "maxItems", "uniqueItems",
]);

export function forStructuredOutput(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(forStructuredOutput);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_JSON_SCHEMA_KEYWORDS.has(key)) continue;
      out[key] = forStructuredOutput(value);
    }
    // Structured outputs require every object to forbid extra properties.
    if (out.type === "object" && !("additionalProperties" in out)) {
      out.additionalProperties = false;
    }
    return out;
  }
  return node;
}

// Zod 4 native JSON Schema, sanitised for Anthropic's output_config.format.
export const taggingJsonSchema = forStructuredOutput(
  z.toJSONSchema(TagSchema),
) as Record<string, unknown>;
