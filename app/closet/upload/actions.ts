"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tagItem } from "@/lib/ai/tag-item";
import { TagSchema, type Rotation, type Tags } from "@/lib/ai/tagging-schema";
import { tagsToItemRow } from "@/lib/ai/parse-tags";
import { cutoutFilename, type CutoutMediaType } from "@/lib/images/encode";
import { thumbFilename, type ThumbMediaType } from "@/lib/images/thumb";
import { assertCanUpload, readUploadAllowance } from "@/lib/billing/entitlements";
import { UploadLimitError } from "@/lib/billing/errors";
import { assertDraftIdentity, groupOwnedDraftPaths } from "@/lib/closet/capture-paths";

export type UploadAndTagResult =
  | { status: "ready"; itemId: string; imagePath: string; cutoutPath: string;
      thumbPath: string | null; tags: Tags; rotation: Rotation }
  | { status: "limited"; message: string };

export type ConfirmItemResult = { status: "saved" } | { status: "limited"; message: string };

type StoredDraft = { id: string; user_id: string; image_url: string; cutout_url: string | null };

async function readItemById(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string) {
  const { data, error } = await supabase.from("items")
    .select("id,user_id,image_url,cutout_url").eq("id", itemId).maybeSingle();
  if (error) throw error;
  return data as StoredDraft | null;
}

function matchingDraft(row: StoredDraft, userId: string, imagePath: string, base: string) {
  return row.user_id === userId && row.image_url === imagePath &&
    (row.cutout_url === `${base}/cutout.webp` || row.cutout_url === `${base}/cutout.png`);
}

export async function getUploadCapacity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return readUploadAllowance();
}

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
}): Promise<UploadAndTagResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Gated HERE, not at confirm: everything expensive about adding a piece —
  // two storage writes and the Haiku tagging call — happens below, before the
  // user ever reaches the confirm screen. A limit checked at confirm would
  // have already paid for the item it refuses.
  try {
    await assertCanUpload();
  } catch (error) {
    if (error instanceof UploadLimitError) return { status: "limited", message: error.message };
    throw error;
  }

  const itemId = crypto.randomUUID();
  const base = `${user.id}/${itemId}`;
  const orig = Buffer.from(form.originalB64, "base64");
  const cut = Buffer.from(form.cutoutB64, "base64");
  const bucket = supabase.storage.from("wardrobe");
  const imagePath = `${base}/original.jpg`;
  const cutoutName = cutoutFilename(form.mediaType);
  const cutoutPath = `${base}/${cutoutName}`;
  const attempted: string[] = [];
  let thumbPath: string | null = null;
  try {
    attempted.push(imagePath);
    const originalWrite = await bucket.upload(imagePath, orig, { contentType: "image/jpeg" });
    if (originalWrite.error) throw originalWrite.error;

    attempted.push(cutoutPath);
    const cutoutWrite = await bucket.upload(cutoutPath, cut, { contentType: form.mediaType });
    if (cutoutWrite.error) throw cutoutWrite.error;

    if (form.thumbB64 && form.thumbMediaType) {
      const nextThumbPath = `${base}/${thumbFilename(form.thumbMediaType)}`;
      attempted.push(nextThumbPath);
      try {
        const thumbWrite = await bucket.upload(
          nextThumbPath, Buffer.from(form.thumbB64, "base64"),
          { contentType: form.thumbMediaType },
        );
        if (thumbWrite.error) throw thumbWrite.error;
        thumbPath = nextThumbPath;
      } catch {
        // Thumbnails are optional. A failed upload may still leave an object.
        try { await bucket.remove([nextThumbPath]); } catch { /* orphan sweep backstop */ }
      }
    }

    // Tag the full cutout, never its smaller thumbnail.
    const { tags, rotation } = await tagItem(form.cutoutB64, form.mediaType);
    return { status: "ready", itemId, imagePath, cutoutPath, thumbPath, tags, rotation };
  } catch (error) {
    try { await bucket.remove(attempted); } catch { /* orphan sweep backstop */ }
    throw error;
  }
}

// Re-validate the (possibly user-edited) tags and insert the item. When the
// user rotated the cutout, the rotated blobs replace the uploaded ones first,
// so the row only ever points at upright images.
export async function confirmItem(input: {
  itemId: string;
  imagePath: string;
  cutoutPath: string;
  thumbPath?: string | null;
  name?: string | null;
  brand?: string | null;
  tags: unknown;
  rotated?: {
    cutoutB64: string;
    mediaType: CutoutMediaType;
    thumbB64: string | null;
    thumbMediaType: ThumbMediaType | null;
  } | null;
}): Promise<ConfirmItemResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const base = assertDraftIdentity(user.id, input);
  const existing = await readItemById(supabase, input.itemId);
  if (existing) {
    if (!matchingDraft(existing, user.id, input.imagePath, base)) throw new Error("Not your upload");
    return { status: "saved" };
  }
  try {
    await assertCanUpload();
  } catch (error) {
    if (error instanceof UploadLimitError) return { status: "limited", message: error.message };
    throw error;
  }

  const tags = TagSchema.parse(input.tags);

  let cutoutPath = input.cutoutPath;
  let thumbPath = input.thumbPath ?? null;
  if (input.rotated) {
    // Same defence as discardDraft: client-supplied paths, checked against the caller.
    for (const p of [cutoutPath, thumbPath]) if (p && !p.startsWith(`${user.id}/`)) throw new Error("Not your upload");
    const base = cutoutPath.slice(0, cutoutPath.lastIndexOf("/"));
    const nextCutout = `${base}/${cutoutFilename(input.rotated.mediaType)}`;
    const { error } = await supabase.storage
      .from("wardrobe")
      .upload(nextCutout, Buffer.from(input.rotated.cutoutB64, "base64"), {
        contentType: input.rotated.mediaType,
        upsert: true,
      });
    if (error) throw error;
    const stale: (string | null)[] = [cutoutPath !== nextCutout ? cutoutPath : null];
    cutoutPath = nextCutout;

    let nextThumb: string | null = null;
    if (input.rotated.thumbB64 && input.rotated.thumbMediaType) {
      nextThumb = `${base}/${thumbFilename(input.rotated.thumbMediaType)}`;
      const { error: thumbError } = await supabase.storage
        .from("wardrobe")
        .upload(nextThumb, Buffer.from(input.rotated.thumbB64, "base64"), {
          contentType: input.rotated.thumbMediaType,
          upsert: true,
        });
      if (thumbError) nextThumb = null;
    }
    if (thumbPath && thumbPath !== nextThumb) stale.push(thumbPath);
    thumbPath = nextThumb;
    const remove = stale.filter((p): p is string => !!p);
    if (remove.length) await supabase.storage.from("wardrobe").remove(remove);
  }

  const row = {
    ...tagsToItemRow({
      userId: user.id,
      imageUrl: input.imagePath,
      cutoutUrl: cutoutPath,
      thumbUrl: thumbPath,
      tags,
    }),
    name: input.name ?? tags.subcategory,
    brand: input.brand ?? null,
    id: input.itemId,
  };
  const { error } = await supabase.from("items").insert(row);
  if (error) {
    if (error.code === "23505") {
      const concurrent = await readItemById(supabase, input.itemId);
      if (concurrent && matchingDraft(concurrent, user.id, input.imagePath, base)) {
        return { status: "saved" };
      }
    }
    throw error;
  }
  revalidatePath("/closet");
  return { status: "saved" };
}

/**
 * Throw away an capture the user rejected on the confirm screen.
 *
 * ⚠️ **This is the orphan class, closed at source.** `uploadAndTag` writes both
 * blobs to Storage BEFORE any row exists, so until now the only way out of the
 * confirm screen was to navigate away — which stranded them forever.
 * `scripts/sweep-orphan-uploads.ts` had to reclaim them afterwards, and still
 * does for the paths this cannot reach: crashes, closed tabs, dead connections.
 *
 * No DB work: there is no row yet. That is the whole point of the two-phase
 * capture (Decision 2/3).
 */
export async function discardDraft(paths: (string | null)[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  /**
   * ⚠️ Defence in depth, not the primary guard. These paths arrive from the
   * CLIENT, so they are checked against the caller rather than trusted — but
   * the bucket's RLS policy (`wardrobe_rw_own`, migration 20260615114702)
   * already pins `storage.foldername(name)[1]` to `auth.uid()`, so a
   * cross-user delete is impossible at the database level either way.
   */
  for (const [itemId, draftPaths] of groupOwnedDraftPaths(user.id, paths)) {
    const saved = await readItemById(supabase, itemId);
    if (!saved) await supabase.storage.from("wardrobe").remove(draftPaths);
  }
}
