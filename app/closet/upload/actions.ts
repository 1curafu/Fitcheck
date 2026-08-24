"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tagItem } from "@/lib/ai/tag-item";
import { TagSchema } from "@/lib/ai/tagging-schema";
import { tagsToItemRow } from "@/lib/ai/parse-tags";
import { cutoutFilename, type CutoutMediaType } from "@/lib/images/encode";
import { thumbFilename, type ThumbMediaType } from "@/lib/images/thumb";
import { assertCanUpload } from "@/lib/billing/entitlements";

// Upload both blobs to Storage, then return a DRAFT tag set for the confirm
// screen. No DB insert yet — the user confirms first.
export async function uploadAndTag(form: {
  originalB64: string;
  cutoutB64: string;
  mediaType: CutoutMediaType;
  // Absent when the device could not produce a materially smaller derivative.
  // Not an error: the item uploads without one and readers fall through to the
  // cutout, which is the same path every pre-thumbnail row already takes.
  thumbB64?: string | null;
  thumbMediaType?: ThumbMediaType | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Gated HERE, not at confirm: everything expensive about adding a piece —
  // two storage writes and the Haiku tagging call — happens below, before the
  // user ever reaches the confirm screen. A limit checked at confirm would
  // have already paid for the item it refuses.
  await assertCanUpload();

  const itemId = crypto.randomUUID();
  const base = `${user.id}/${itemId}`;
  const orig = Buffer.from(form.originalB64, "base64");
  const cut = Buffer.from(form.cutoutB64, "base64");

  await supabase.storage.from("wardrobe").upload(`${base}/original.jpg`, orig, {
    contentType: "image/jpeg",
  });
  // The stored extension and content type follow the format actually produced,
  // so WebP and legacy PNG cutouts coexist without a migration.
  const cutoutName = cutoutFilename(form.mediaType);
  await supabase.storage.from("wardrobe").upload(`${base}/${cutoutName}`, cut, {
    contentType: form.mediaType,
  });

  // ⚠️ Uploaded, never tagged. The tagger reads the CUTOUT — a 480px thumbnail
  // at quality 0.8 is exactly the compressed input Anthropic's vision guidance
  // warns costs accuracy, and it is the reason `encode.ts` holds the cutout at
  // 0.85 in the first place.
  let thumbPath: string | null = null;
  if (form.thumbB64 && form.thumbMediaType) {
    const thumbName = thumbFilename(form.thumbMediaType);
    const { error } = await supabase.storage
      .from("wardrobe")
      .upload(`${base}/${thumbName}`, Buffer.from(form.thumbB64, "base64"), {
        contentType: form.thumbMediaType,
      });
    // A thumbnail that fails to store must not fail the upload the user is
    // waiting on — it is an optimisation, and its absence is already handled.
    if (!error) thumbPath = `${base}/${thumbName}`;
  }

  const tags = await tagItem(form.cutoutB64, form.mediaType);
  return {
    itemId,
    imagePath: `${base}/original.jpg`,
    cutoutPath: `${base}/${cutoutName}`,
    thumbPath,
    tags,
  };
}

// Re-validate the (possibly user-edited) tags and insert the item.
export async function confirmItem(input: {
  imagePath: string;
  cutoutPath: string;
  thumbPath?: string | null;
  name?: string | null;
  brand?: string | null;
  tags: unknown;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const tags = TagSchema.parse(input.tags);
  const row = {
    ...tagsToItemRow({
      userId: user.id,
      imageUrl: input.imagePath,
      cutoutUrl: input.cutoutPath,
      thumbUrl: input.thumbPath ?? null,
      tags,
    }),
    name: input.name ?? tags.subcategory,
    brand: input.brand ?? null,
  };
  const { error } = await supabase.from("items").insert(row);
  if (error) throw error;
  revalidatePath("/closet");
}
