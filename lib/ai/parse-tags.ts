import { TagSchema, type Tags } from "./tagging-schema";

export function parseTagText(text: string): Tags {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Tagging response was not JSON");
  }
  return TagSchema.parse(json);
}

export function tagsToItemRow(args: {
  userId: string;
  imageUrl: string;
  cutoutUrl: string | null;
  thumbUrl?: string | null;
  tags: Tags;
}) {
  const { userId, imageUrl, cutoutUrl, thumbUrl = null, tags } = args;
  return {
    user_id: userId,
    image_url: imageUrl,
    cutout_url: cutoutUrl,
    thumb_url: thumbUrl,
    category: tags.category,
    subcategory: tags.subcategory,
    colors: tags.colors,
    pattern: tags.pattern,
    material: tags.material,
    texture: tags.texture,
    formality: tags.formality,
    seasons: tags.seasons,
    accent_color: tags.accent_color,
    branding: tags.branding,
    fit: tags.fit,
    length: tags.length,
    // ⚠️ Category-gated here, not trusted from the model. The prompt says
    // FOOTWEAR ONLY, but a prompt is guidance and this is an invariant: a sole
    // value on a knit would make the proportion rules compare a bulk that
    // cannot exist.
    bulk: tags.category === "Shoes" ? tags.bulk : null,
    // ⚠️ Coerced here, not passed through, because this column doubles as the
    // "has this row been through the tagger" sentinel for the backfill script.
    // The model is permitted to return null (`z.enum(DISTRESSING).nullable()`)
    // and on the real closet it returned null for `branding` on 3 of 26 rows —
    // "the model always fills it" is not a property we may rely on. The prompt
    // already says "Use None for a clean garment", so null and "None" carry the
    // same meaning here and nothing is lost.
    distressing: tags.distressing ?? "None",
  };
}
