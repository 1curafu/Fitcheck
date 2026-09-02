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
    bulk: tags.bulk,
    distressing: tags.distressing,
  };
}
