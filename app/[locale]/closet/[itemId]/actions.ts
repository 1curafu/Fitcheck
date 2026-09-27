"use server";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale } from "next-intl/server";

import { revalidateEverywhere } from "@/lib/i18n/revalidate";

import { createClient } from "@/lib/supabase/server";
import { UpdateSchema } from "@/lib/closet/update-schema";
import { resolveAccent } from "@/lib/ai/parse-tags";
import { assertCanUpload } from "@/lib/billing/entitlements";
import { UploadLimitError } from "@/lib/billing/errors";
import { isItemId } from "@/lib/closet/capture-paths";
import { originalLocation } from "@/lib/closet/original-path";
import { DELETE_FAILED, DELETE_NOT_REMOVED, ERASE_ALREADY, ERASE_FAILED, ERASE_NO_CUTOUT } from "@/lib/closet/erase-copy";

export async function updateItem(itemId: string, input: unknown) {
  const data = UpdateSchema.parse(input);
  const supabase = await createClient();
  // RLS scopes this to the owner's rows; a foreign id simply matches 0 rows.
  const { error } = await supabase
    .from("items")
    .update({
      name: data.name,
      brand: data.brand,
      category: data.category,
      subcategory: data.subcategory,
      colors: data.colors,
      pattern: data.pattern,
      material: data.material,
      texture: data.texture,
      price: data.price,
      formality: data.formality,
      seasons: data.seasons,
      // Same rule as the capture path: an accent repeating one of the item's
      // own colours is not a placement and must not be stored. See resolveAccent.
      accent_color: resolveAccent(data.colors, data.accent_color),
      branding: data.branding,
      fit: data.fit,
      fit_source: data.fit_source,
      length: data.length,
      bulk: data.bulk,
      distressing: data.distressing,
    })
    .eq("id", itemId);
  if (error) throw error;
  revalidateEverywhere("/closet");
  revalidateEverywhere(`/closet/${itemId}`);
}

export async function archiveItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ archived: true })
    .eq("id", itemId);
  if (error) throw error;
  revalidateEverywhere("/closet");
  return redirect({ href: "/closet", locale: await getLocale() });
}

export type EraseResult = { status: "unavailable"; message: string } | { status: "error"; message: string };
export type DeleteResult = { status: "unavailable"; message: string } | { status: "error"; message: string };
export type RestoreResult = { status: "restored" } | { status: "limited"; message: string };

function revalidatePiece(itemId: string) {
  revalidateEverywhere("/closet");
  revalidateEverywhere("/closet/removed");
  revalidateEverywhere(`/closet/${itemId}`);
}

function splitPath(path: string) {
  const cut = path.lastIndexOf("/");
  return { folder: path.slice(0, cut), file: path.slice(cut + 1) };
}

/**
 * Erases a piece's ORIGINAL photo for good and removes the piece from the closet. The cut-out and thumbnail stay, so
 * every past look, calendar cell and stat is unchanged (spec 2026-09-26, owner decisions D1/D2).
 *
 * ⚠️ The cut-out OBJECT must be proven present first. Before aa27095, capture ignored upload errors, so a row can
 * name a cut-out that was never stored. Erasing that row's original would leave a blank piece forever.
 * ⚠️ Then Storage, verified, THEN the row. If the photo cannot be proven gone, the row still points at it and the
 * user can retry. Row-first would leave a photo we claim is erased, and the orphan sweep never deletes inside a live
 * folder. A retry is idempotent: removing a missing object is not an error.
 */
export async function eraseOriginal(itemId: string): Promise<EraseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!isItemId(itemId)) throw new Error("Not found");

  const { data: row, error } = await supabase
    .from("items")
    .select("id, image_url, cutout_url, archived")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Not found");
  if (!row.cutout_url) return { status: "unavailable", message: ERASE_NO_CUTOUT };
  // Already erased: no writes. Re-archiving here would undo a Put back made since (e.g. from another tab).
  if (!row.image_url) return { status: "unavailable", message: ERASE_ALREADY };

  const where = originalLocation(user.id, row.image_url);
  if (!where) throw new Error("Not your upload");
  const cutout = splitPath(row.cutout_url);
  if (cutout.folder !== where.folder) return { status: "unavailable", message: ERASE_NO_CUTOUT };

  const bucket = supabase.storage.from("wardrobe");
  const before = await bucket.list(where.folder);
  if (before.error) return { status: "error", message: ERASE_FAILED };
  if (!(before.data ?? []).some((f) => f.name === cutout.file)) {
    return { status: "unavailable", message: ERASE_NO_CUTOUT };
  }

  const removed = await bucket.remove([row.image_url]);
  if (removed.error) return { status: "error", message: ERASE_FAILED };
  const after = await bucket.list(where.folder);
  if (after.error || (after.data ?? []).some((f) => f.name === where.file)) {
    return { status: "error", message: ERASE_FAILED };
  }

  const { error: updateError } = await supabase
    .from("items")
    .update({ image_url: null, archived: true })
    .eq("id", itemId);
  if (updateError) throw updateError;
  revalidatePiece(itemId);
  return redirect({ href: "/closet", locale: await getLocale() });
}

/** Puts a removed piece back in the closet. It counts toward the Free limit exactly like a new capture. */
export async function restoreItem(itemId: string): Promise<RestoreResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!isItemId(itemId)) throw new Error("Not found");

  const { data: row, error } = await supabase.from("items").select("id, archived").eq("id", itemId).maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Not found");

  if (row.archived) {
    try {
      await assertCanUpload();
    } catch (e) {
      if (e instanceof UploadLimitError) return { status: "limited", message: e.message };
      throw e;
    }
    const { error: updateError } = await supabase.from("items").update({ archived: false }).eq("id", itemId);
    if (updateError) throw updateError;
  }
  revalidatePiece(itemId);
  return { status: "restored" };
}

const FOLDER_SEGMENT = /^[A-Za-z0-9_-]+$/;

/** `<userId>/<folder>` for a stored path the caller owns; the segment is strict because it goes into a filter string. */
function ownedFolder(userId: string, path: string): string | null {
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [owner, folder, file] = parts;
  if (owner !== userId || !FOLDER_SEGMENT.test(folder) || !file || file === "." || file === "..") return null;
  return `${owner}/${folder}`;
}

/**
 * Deletes a removed piece for good (owner decision 2026-09-27): every photo in its folder, then the row. Past looks,
 * the calendar and trips lose the piece and keep their other pieces; a look styled around it goes with it (FK cascades).
 *
 * ⚠️ Storage first, verified, THEN the row — the same order as eraseOriginal, so a failure leaves a piece the user can
 * retry rather than photos no row points at. A folder another saved piece still uses keeps that piece's files.
 */
export async function deletePiece(itemId: string): Promise<DeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!isItemId(itemId)) throw new Error("Not found");

  const { data: row, error } = await supabase
    .from("items")
    .select("id, image_url, cutout_url, thumb_url, archived")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Not found");
  if (!row.archived) return { status: "unavailable", message: DELETE_NOT_REMOVED };

  const own = new Map<string, string[]>();
  for (const path of [row.image_url, row.cutout_url, row.thumb_url]) {
    if (!path) continue;
    const folder = ownedFolder(user.id, path);
    if (!folder) throw new Error("Not your upload");
    own.set(folder, [...(own.get(folder) ?? []), path]);
  }

  const bucket = supabase.storage.from("wardrobe");
  for (const [folder, paths] of own) {
    const { data: others, error: othersError } = await supabase
      .from("items")
      .select("id")
      .neq("id", itemId)
      .or(`image_url.like.${folder}/*,cutout_url.like.${folder}/*,thumb_url.like.${folder}/*`)
      .limit(1);
    if (othersError) return { status: "error", message: DELETE_FAILED };
    const before = await bucket.list(folder);
    if (before.error) return { status: "error", message: DELETE_FAILED };
    const targets = (others ?? []).length > 0 ? paths : (before.data ?? []).map((f) => `${folder}/${f.name}`);
    if (targets.length > 0) {
      const removed = await bucket.remove(targets);
      if (removed.error) return { status: "error", message: DELETE_FAILED };
    }
    const after = await bucket.list(folder);
    const left = new Set((after.data ?? []).map((f) => `${folder}/${f.name}`));
    if (after.error || targets.some((t) => left.has(t))) return { status: "error", message: DELETE_FAILED };
  }

  const { error: deleteError } = await supabase.from("items").delete().eq("id", itemId);
  if (deleteError) throw deleteError;
  revalidatePiece(itemId);
  revalidateEverywhere("/calendar");
  revalidateEverywhere("/stats");
  return redirect({ href: "/closet/removed", locale: await getLocale() });
}
