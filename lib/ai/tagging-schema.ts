import { z } from "zod";

// Categories + seasons match the prototype (Title case) so tags line up with
// the closet filters and the generator.
export const TagSchema = z.object({
  category: z.enum(["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"]),
  subcategory: z.string().min(1),
  colors: z.array(z.string()).min(1).max(3),
  pattern: z.enum(["solid", "striped", "check", "print", "other"]),
  material: z.string().min(1),
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

function forStructuredOutput(node: unknown): unknown {
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
