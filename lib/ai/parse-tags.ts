import { TagSchema, WEARABLE_CATEGORIES, type Tags } from "./tagging-schema";

// `fit` and `length` are BODY-REFERENCED — a hem placement and a fit correction
// both require a body wearing the garment. Shoes, accessories and fragrance
// have neither, the same argument that made `bulk` (below) footwear-only.

export function parseTagText(text: string): Tags {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Tagging response was not JSON");
  }
  // The model is never asked for fit_source (see tagging-schema.ts), so its
  // response never carries the key. Default it to null here rather than
  // leaving it undefined — TagSchema requires the key to be present, and
  // tagsToItemRow is where an untouched null becomes "model".
  return TagSchema.parse({ fit_source: null, ...(json as Record<string, unknown>) });
}

/**
 * The accent to store: null when it merely repeats one of the garment's own
 * colours.
 *
 * Exported because BOTH write paths need it — the capture path below and the
 * edit sheet's update action. Two copies of this rule would be the same defect
 * shape that `WEARABLE_CATEGORIES` was hoisted to prevent.
 */
export function resolveAccent(colors: string[], accent: string | null | undefined): string | null {
  if (!accent) return null;
  const a = accent.trim().toLowerCase();
  return colors.some((c) => c.trim().toLowerCase() === a) ? null : accent;
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
    // ⚠️ An accent that repeats one of the garment's own colours is dropped.
    // It is not a placement — a navy logo on a navy shirt is invisible — and
    // the accent ROLE is what lets a neutral join a colour echo, so storing it
    // handed tonal dressing a reward the rule exists to withhold. `withAccent`
    // in lib/generator/styling/echo.ts defends every read for the sake of rows
    // written before this; this keeps new rows honest so the edit sheet does
    // not offer a redundant accent back to the user.
    accent_color: resolveAccent(tags.colors, tags.accent_color),
    branding: tags.branding,
    // ⚠️ Category-gated on write, not merely hidden in the UI. The prompt asks
    // the model to return null for these on footwear, but a prompt is guidance
    // and this is an invariant — and a `fit` recorded against a sneaker is not
    // just meaningless, it inflates the "how many items carry a real fit"
    // count a later plan gates its proportion rules on.
    fit: WEARABLE_CATEGORIES.has(tags.category) ? tags.fit : null,
    // ⚠️ A draft that reached this row untouched came from the model — the
    // confirm screen pre-selects the model's guess, so accepting it costs no
    // taps and leaves fit_source null. The confirm screen's and edit sheet's
    // Fit chips set "user" the moment a human actually taps one; anything
    // else that arrives here null is, by construction, the model's own guess.
    // Nulled alongside `fit` on a non-wearable category — a stale "user" on
    // an absent fit is exactly what this column exists to prevent.
    fit_source: WEARABLE_CATEGORIES.has(tags.category) ? (tags.fit_source ?? "model") : null,
    length: WEARABLE_CATEGORIES.has(tags.category) ? tags.length : null,
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
