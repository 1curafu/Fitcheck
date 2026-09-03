import { z } from "zod";
import { TagSchema } from "@/lib/ai/tagging-schema";

/**
 * Lives outside the Server Action module so it can be unit-tested: a
 * "use server" file may only export async functions.
 *
 * Every field the tagger writes appears here. CLAUDE.md treats AI tags as a
 * draft, so a tag the model can set and the user cannot correct is a defect —
 * `colors` in particular feeds the generator's colour harmony scoring.
 *
 * `price` is the exception: the tagger never writes it (a photo cannot tell you
 * what something cost), so it is user-entered only. Nullable because most items
 * have no recorded price, and cost-per-wear must divide by nothing rather than
 * by a fabricated zero.
 */
export const UpdateSchema = z.object({
  name: z.string().nullable(),
  brand: z.string().nullable(),
  category: TagSchema.shape.category,
  subcategory: z.string().nullable(),
  colors: TagSchema.shape.colors,
  pattern: TagSchema.shape.pattern,
  material: TagSchema.shape.material,
  texture: TagSchema.shape.texture,
  formality: TagSchema.shape.formality,
  seasons: TagSchema.shape.seasons,
  price: z.number().nonnegative().nullable(),
  accent_color: TagSchema.shape.accent_color,
  branding: TagSchema.shape.branding,
  fit: TagSchema.shape.fit,
  length: TagSchema.shape.length,
  bulk: TagSchema.shape.bulk,
  distressing: TagSchema.shape.distressing,
});
