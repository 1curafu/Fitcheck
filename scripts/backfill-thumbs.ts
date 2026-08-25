/**
 * One-off: give every pre-existing item the thumbnail the upload pipeline now
 * produces (`lib/images/thumb.ts`).
 *
 * New items get one in the browser, for free, while the device is already
 * running a WASM segmentation model. Rows that predate that column have no
 * thumbnail and fall through to the full cutout — correct, and the whole reason
 * this backfill exists: without it the closet grid and the diary keep pulling
 * 1280px images into 45-160px cells for every closet uploaded before today.
 *
 * Usage: npx tsx scripts/backfill-thumbs.ts [--apply]
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * ⚠️ **DRY RUN BY DEFAULT** — `--apply` is required to write anything. The
 * inverse of `backfill-item-tags.ts`, whose opt-in `--dry-run` let this script
 * family modify 15 real rows by accident once already. This one uploads objects
 * AND writes rows, so the default is the safe one.
 *
 * ⚠️ Service-role. It crosses all users' rows, so it lives in scripts/ and must
 * never be imported by app code. Service-role bypasses RLS but NOT table
 * privileges — see migration 20260729090000.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { THUMB_MAX_PX } from "../lib/images/options";

const apply = process.argv.includes("--apply");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;

/**
 * Resize server-side to the same box the browser uses.
 *
 * ⚠️ `fit: "inside"` + `withoutEnlargement` mirrors `fitWithin` exactly: cap the
 * longest side, preserve the ratio, never upscale. And NO background is set —
 * cutouts are transparent and float on dark surfaces; a white matte here would
 * look perfect in a byte count and ruin every screen it reaches.
 */
async function shrink(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .resize(THUMB_MAX_PX, THUMB_MAX_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

async function main() {
  // Archived rows included: an archived item can be restored, and it would come
  // back as the only piece in the closet still costing full-size bytes.
  const { data: items, error } = await db
    .from("items")
    .select("id, user_id, cutout_url, image_url, thumb_url");
  if (error) throw error;

  const pending = (items ?? []).filter((i) => !i.thumb_url);
  console.log(
    `${items?.length ?? 0} items, ${pending.length} without a thumbnail.` +
      (apply ? "" : "  (dry run — pass --apply to write)"),
  );

  let done = 0;
  let skipped = 0;
  let before = 0;
  let after = 0;

  for (const item of pending) {
    // The cutout is what every thumbnail surface renders. A row whose
    // background removal failed has none; its original is a photo on a
    // background and shrinking it would put a rectangle in a grid of cutouts.
    // Leave it — `displayPath` already falls through correctly.
    if (!item.cutout_url) {
      console.log(`  ${item.id}: no cutout, skipped`);
      skipped++;
      continue;
    }

    const { data: blob, error: dlError } = await db.storage
      .from("wardrobe")
      .download(item.cutout_url);
    if (dlError || !blob) {
      console.log(`  ${item.id}: cutout missing from storage, skipped`);
      skipped++;
      continue;
    }

    const source = Buffer.from(await blob.arrayBuffer());
    const thumb = await shrink(source);
    before += source.length;
    after += thumb.length;

    // Same rule as the browser path: a derivative that is not materially
    // smaller is pure cost — an object, a column and a second signed URL.
    if (thumb.length >= source.length * 0.8) {
      console.log(`  ${item.id}: ${kb(source.length)} → ${kb(thumb.length)}, not worth storing`);
      skipped++;
      after -= thumb.length;
      before -= source.length;
      continue;
    }

    /**
     * ⚠️ **Derived from `cutout_url`, NEVER from `item.id`.** The storage folder
     * is not the row id: `uploadAndTag` mints its own `crypto.randomUUID()` for
     * the path, and the `items` row gets a different id from its column
     * default. Building the path from `item.id` puts the thumbnail in a folder
     * that holds nothing else — which still "works", because `thumb_url` points
     * at it, and is silently wrong. The first run of this script did exactly
     * that to all 26 rows.
     */
    const path = item.cutout_url.replace(/[^/]+$/, "thumb.webp");
    console.log(`  ${item.id}: ${kb(source.length)} → ${kb(thumb.length)}`);

    if (apply) {
      const { error: upError } = await db.storage
        .from("wardrobe")
        .upload(path, thumb, { contentType: "image/webp", upsert: true });
      if (upError) throw new Error(`uploading ${path} failed: ${upError.message}`);

      // ⚠️ Object first, row second. The reverse would point a row at an object
      // that does not exist yet, and a tile whose image never loads hangs the
      // page rather than degrading.
      const { error: rowError } = await db
        .from("items")
        .update({ thumb_url: path })
        .eq("id", item.id);
      if (rowError) throw new Error(`updating ${item.id} failed: ${rowError.message}`);
    }
    done++;
  }

  console.log(
    `\n${done} thumbnail${done === 1 ? "" : "s"} ${apply ? "written" : "would be written"}, ${skipped} skipped.`,
  );
  if (before > 0) {
    console.log(
      `${kb(before)} of cutouts → ${kb(after)} of thumbnails ` +
        `(${(100 - (after / before) * 100).toFixed(0)}% smaller).`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
