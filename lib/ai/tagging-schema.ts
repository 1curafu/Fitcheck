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

/**
 * The colour vocabulary — the ONE list, enforced on the model.
 *
 * This was `z.array(z.string())` until 2026-08-06, while the edit screens
 * offered a 21-swatch picker: the model could write "khaki" or "off-white",
 * which `colorHex()` could not render a swatch for and the user could not
 * reselect. `lib/generator/color.ts` had meanwhile widened its families with
 * ~23 free-form names (sand, oatmeal, cognac, terracotta, onyx…) to catch that
 * output, so three vocabularies were drifting apart at once.
 *
 * Constrained here for the same reason MATERIALS and TEXTURES are: the model is
 * constrained, not asked nicely. `lib/closet/vocab.ts` attaches the hex and the
 * neutral flag to these names, and a test pins the two lists together.
 */
export const COLOR_NAMES = [
  // Achromatic
  "black", "charcoal", "grey", "silver", "white", "ivory", "cream",
  // Warm neutrals / earths
  "stone", "sand", "beige", "taupe", "khaki", "camel", "tan", "caramel", "chocolate", "brown",
  // Blues
  "navy", "indigo", "denim", "blue", "sky", "teal",
  // Greens
  "olive", "sage", "forest", "green", "mint",
  // Reds / pinks
  "burgundy", "maroon", "red", "rust", "terracotta", "coral", "pink",
  // Purples
  "purple", "lavender", "plum",
  // Yellows / oranges
  "mustard", "yellow", "gold", "orange",
] as const;

/** How loud the visible branding is. Counted per OUTFIT (max ~2), not judged per garment. */
export const BRANDING = ["None", "Small", "Large"] as const;

/**
 * How the garment is cut and worn.
 *
 * ⚠️ The one tag the USER answers rather than the model. Everything else here is
 * visible in a cutout; "oversized" is relative to a body the photo does not
 * contain. Haiku still drafts a guess from the cut, and the confirm screen asks.
 */
export const FITS = ["Fitted", "Tailored", "Regular", "Relaxed", "Oversized"] as const;

/**
 * WHERE THE HEM FALLS ON THE BODY.
 *
 * ⚠️ Revised 2026-09-01 after a full re-read of `docs/research/`. The first draft
 * was `["Cropped","Regular","Long","Extra long"]`, which tried to serve two
 * DIFFERENT axes with one vocabulary — hem length on a top, and the break on a
 * trouser — so "Regular" meant nothing consistent across them and the proportion
 * rules could not compare a top against a bottom.
 *
 * Research §A.4 answers the question directly: the rule-of-thirds and the
 * volume-balance formulas are defined by *where a hem falls*, not by fabric
 * fullness. Body-referenced placement unifies both axes — a trouser's break IS
 * its hem placement — so one field still serves every role:
 *
 *   Cropped       above the natural waist (top) · above the ankle (trouser, skirt)
 *   Natural waist a top ending at the waist
 *   Hip           a top or jacket ending at the hip
 *   Knee          skirt, dress or shorts at the knee
 *   Midi          mid-calf
 *   Ankle         a full-length trouser meeting the shoe with no break
 *   Floor         floor-length, or a trouser stacking over the shoe
 *
 * ⚠️ Widened NOW, before the migration runs, because an enum is cheap to change
 * while no data exists and expensive afterwards — every stored value would need
 * re-tagging. `Floor` deliberately carries both "floor-length gown" and "stacked
 * trouser": both mean the hem reaches the ground, which is what the stacking ×
 * chunky-sole rule compares.
 */
export const LENGTHS = [
  "Cropped", "Natural waist", "Hip", "Knee", "Midi", "Ankle", "Floor",
] as const;

/** Footwear silhouette. Null on everything that is not a shoe. */
export const BULKS = ["Low profile", "Regular", "Chunky"] as const;

/**
 * Visible wear on a garment.
 *
 * Backs a HARD rule the research states outright: distressed and ripped denim is
 * excluded from business formal and most business casual. Not womenswear-specific
 * — r1-ext asks for "tailored, distress-free jeans" in the classic register too.
 *
 * ⚠️ Deliberately NOT a `wash` field. Light-vs-dark wash is ALREADY expressible
 * through `material: "Denim"` plus the colour (`sky`/`denim` light, `indigo`/`navy`
 * dark). Adding a wash column would give one fact two sources, which drift.
 * Distressing is the half nothing carried.
 *
 * 'Faded' = whiskering, fading, abrasion, no holes. 'Ripped' = holes, tears,
 * deliberate destruction.
 */
export const DISTRESSING = ["None", "Faded", "Ripped"] as const;

// Categories + seasons match the prototype (Title case) so tags line up with
// the closet filters and the generator.
export const TagSchema = z.object({
  category: z.enum(["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories", "Fragrance"]),
  subcategory: z.string().min(1),
  colors: z.array(z.enum(COLOR_NAMES)).min(1).max(3),
  pattern: z.enum(["solid", "striped", "check", "print", "other"]),
  material: z.enum(MATERIALS),
  texture: z.enum(TEXTURES),
  formality: z.number().int().min(1).max(5),
  seasons: z.array(z.enum(["Spring", "Summer", "Autumn", "Winter"])).min(1),

  /**
   * A small contrast colour: a logo, a sole, contrast stitching.
   *
   * ⚠️ SEPARATE from `colors` on purpose. `colors` drives the 3-colour ceiling
   * and the harmony score; folding every logo into it would make a two-tone
   * sneaker read as a loud outfit. The accent participates in colour reasoning
   * at its own smaller weight — the research is explicit that "accent" is a tier
   * below dominant and secondary, not a peer.
   */
  accent_color: z.enum(COLOR_NAMES).nullable(),
  branding: z.enum(BRANDING).nullable(),
  fit: z.enum(FITS).nullable(),
  length: z.enum(LENGTHS).nullable(),
  bulk: z.enum(BULKS).nullable(),
  distressing: z.enum(DISTRESSING).nullable(),
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
