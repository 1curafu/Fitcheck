"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tagItem } from "@/lib/ai/tag-item";
import { TagSchema } from "@/lib/ai/tagging-schema";
import { tagsToItemRow } from "@/lib/ai/parse-tags";
import { cutoutFilename, type CutoutMediaType } from "@/lib/images/encode";

// Upload both blobs to Storage, then return a DRAFT tag set for the confirm
// screen. No DB insert yet — the user confirms first.
export async function uploadAndTag(form: {
  originalB64: string;
  cutoutB64: string;
  mediaType: CutoutMediaType;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

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

  const tags = await tagItem(form.cutoutB64, form.mediaType);
  return {
    itemId,
    imagePath: `${base}/original.jpg`,
    cutoutPath: `${base}/${cutoutName}`,
    tags,
  };
}

// Re-validate the (possibly user-edited) tags and insert the item.
export async function confirmItem(input: {
  imagePath: string;
  cutoutPath: string;
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
      tags,
    }),
    name: input.name ?? tags.subcategory,
    brand: input.brand ?? null,
  };
  const { error } = await supabase.from("items").insert(row);
  if (error) throw error;
  revalidatePath("/closet");
}
