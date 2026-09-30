/**
 * One-off: crop every stored cutout to its garment, as capture now does (`lib/images/trim.ts`), and rebuild its
 * thumbnail from the cropped cutout.
 *
 * Cutouts saved before the capture fix keep the whole photo's canvas; the empty margin makes those pieces render
 * small next to new ones (the median test photo 1.28×, worst 1.93×).
 *
 * Usage: npx tsx scripts/backfill-trim-cutouts.ts [--apply]
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (for production: `doppler run --config prd -- …`).
 *
 * ⚠️ **DRY RUN BY DEFAULT** — `--apply` is required to write. It overwrites cutout and thumbnail objects in place
 * (same paths, so no row changes). Take an SSD backup first; the originals are never touched, and a cutout can
 * always be re-made from its original.
 * ⚠️ Idempotent: a cutout already cropped (capture's 2% border, or an earlier run) is skipped. The thumbnail is written
 * BEFORE the cutout, so a run stopped half-way leaves the cutout padded and a rerun redoes the row.
 * ⚠️ Paths come from the row's `cutout_url` / `thumb_url`, never from the item id (see backfill-thumbs.ts).
 * ⚠️ Service-role: crosses all users; lives in scripts/ and must never be imported by app code.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { needsTrim } from "../lib/images/trim";
import { storeTrimmed, trimStoredCutout } from "./trim-cutouts-core";

const apply = process.argv.includes("--apply");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PAGE = 500;
const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;

type Row = { id: string; cutout_url: string | null; thumb_url: string | null };

/** Every item, archived included (a removed piece can be put back and would come back small). Paged: never assume one read sees everything. */
async function allItems(): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from("items").select("id, cutout_url, thumb_url").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

async function download(path: string): Promise<Buffer | null> {
  const { data, error } = await db.storage.from("wardrobe").download(path);
  return error || !data ? null : Buffer.from(await data.arrayBuffer());
}

async function main() {
  const items = await allItems();
  console.log(`${items.length} items.` + (apply ? "" : "  (dry run — pass --apply to write)"));
  let trimmed = 0, tight = 0, skipped = 0;

  for (const item of items) {
    if (!item.cutout_url) { skipped++; continue; }
    const source = await download(item.cutout_url);
    if (!source) { console.log(`  ${item.id}: cutout missing from storage, skipped`); skipped++; continue; }

    const out = await trimStoredCutout(source, item.cutout_url, item.thumb_url);
    if (!out) { tight++; continue; }
    const size = await sharp(out.cutout).metadata();
    console.log(`  ${item.id}: ${kb(source.length)} → ${kb(out.cutout.length)} (${size.width}×${size.height})`);
    trimmed++;
    if (!apply) continue;

    // Thumbnail first, then the cutout (see `storeTrimmed`): an interrupted run must stay detectable as padded.
    await storeTrimmed(
      async (path, body, contentType) => (await db.storage.from("wardrobe").upload(path, body, { contentType, upsert: true })).error ?? null,
      { cutout: item.cutout_url, thumb: item.thumb_url },
      out,
    );
    // Verify what is actually stored, not what was sent.
    const stored = await download(item.cutout_url);
    const { data, info } = await sharp(stored!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (needsTrim({ data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height })) {
      throw new Error(`${item.cutout_url} still has its margin after upload`);
    }
  }

  console.log(`${trimmed} ${apply ? "cropped" : "to crop"} · ${tight} already tight · ${skipped} without a usable cutout`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
