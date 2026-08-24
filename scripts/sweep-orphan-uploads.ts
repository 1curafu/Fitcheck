/**
 * Remove wardrobe objects that no `items` row references.
 *
 * ⚠️ **These are ABANDONED CAPTURES, not deleted items.** There is no delete
 * path in the product (`lib/billing/tiers.ts`) — pieces are archived, and an
 * archived row still references its objects. The leak is the two-phase capture
 * (Decision 2/3): `uploadAndTag` writes `original.jpg` and `cutout.webp` to
 * Storage BEFORE any row exists, and the user confirms afterwards. Back out of
 * the confirm screen, lose signal, or close the app, and the blobs stay forever
 * with nothing pointing at them.
 *
 * The confirm screen has no Cancel control to hang a tidy-up on, and inventing
 * one is a design decision, not a cleanup. A sweep also covers what a Cancel
 * button never could: crashes, closed tabs and dead connections.
 *
 * Usage: npx tsx scripts/sweep-orphan-uploads.ts [--apply] [--min-age-hours=24]
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * ⚠️ **DRY RUN BY DEFAULT.** This one DELETES user data — the strictest default
 * in the script folder, and it still refuses to touch anything recent.
 *
 * ⚠️ **The age guard is load-bearing, not caution.** A capture in flight looks
 * exactly like an orphan: its blobs exist and its row does not. Sweeping
 * without an age floor would delete the photo out from under a user standing on
 * the confirm screen. Nothing younger than --min-age-hours is ever considered.
 *
 * A natural home for this later is Supabase `pg_cron` (free), NOT Vercel cron —
 * Hobby forbids hourly schedules and fails at deploy (`docs/STATE.md`).
 */
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const ageArg = process.argv.find((a) => a.startsWith("--min-age-hours="));
const minAgeHours = ageArg ? Number(ageArg.split("=")[1]) : 24;

if (!Number.isFinite(minAgeHours) || minAgeHours < 0) {
  throw new Error(`--min-age-hours must be a non-negative number, got ${ageArg}`);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
const BUCKET = "wardrobe";

/**
 * Every path any row points at, and the `<owner>/<dir>` prefixes they imply.
 *
 * Archived rows included — an archived piece still owns its images.
 */
async function referenced(): Promise<{ paths: Set<string>; prefixes: Set<string> }> {
  const { data, error } = await db.from("items").select("image_url, cutout_url, thumb_url");
  if (error) throw error;

  const paths = new Set<string>();
  const prefixes = new Set<string>();
  for (const row of data ?? []) {
    for (const path of [row.image_url, row.cutout_url, row.thumb_url]) {
      if (!path) continue;
      paths.add(path);
      const parts = path.split("/");
      if (parts.length >= 2) prefixes.add(`${parts[0]}/${parts[1]}`);
    }
  }
  return { paths, prefixes };
}

async function main() {
  const { paths: livePaths, prefixes: liveFolders } = await referenced();
  const cutoff = Date.now() - minAgeHours * 60 * 60 * 1000;

  console.log(
    `${liveFolders.size} referenced item folders. ` +
      `Ignoring anything modified in the last ${minAgeHours}h.` +
      (apply ? "" : "  (dry run — pass --apply to delete)"),
  );

  const { data: owners, error } = await db.storage.from(BUCKET).list("");
  if (error) throw new Error(`listing the bucket failed: ${error.message}`);

  const doomed: string[] = [];
  const strays: string[] = [];
  let bytes = 0;
  let tooYoung = 0;

  for (const owner of owners ?? []) {
    const { data: dirs } = await db.storage.from(BUCKET).list(owner.name);
    for (const dir of dirs ?? []) {
      const prefix = `${owner.name}/${dir.name}`;

      /**
       * A live folder can still hold a file nothing points at — the backfill
       * writes the object before the row, so a crash between them leaves
       * exactly that. Reported, never deleted: removing a file here would mean
       * knowing every legitimate filename, and guessing wrong deletes a
       * garment. Folder-level is the only judgement this script is safe to make.
       */
      if (liveFolders.has(prefix)) {
        const { data: held } = await db.storage.from(BUCKET).list(prefix);
        for (const f of held ?? []) {
          if (!livePaths.has(`${prefix}/${f.name}`)) strays.push(`${prefix}/${f.name}`);
        }
        continue;
      }

      const { data: files } = await db.storage.from(BUCKET).list(prefix);
      if (!files?.length) continue;

      // Youngest file in the folder decides. A capture that uploaded its
      // original a moment ago is in flight even if the folder looks stale.
      const newest = Math.max(
        ...files.map((f) => new Date(f.updated_at ?? f.created_at ?? 0).getTime()),
      );
      if (newest > cutoff) {
        tooYoung++;
        console.log(`  ${prefix}: unreferenced but recent, left alone`);
        continue;
      }

      const size = files.reduce((n, f) => n + (Number(f.metadata?.size) || 0), 0);
      bytes += size;
      console.log(
        `  ${prefix}: ${files.length} file${files.length === 1 ? "" : "s"}, ${kb(size)}` +
          ` — ${files.map((f) => f.name).join(", ")}`,
      );
      doomed.push(...files.map((f) => `${prefix}/${f.name}`));
    }
  }

  if (apply && doomed.length) {
    const { error: rmError } = await db.storage.from(BUCKET).remove(doomed);
    if (rmError) throw new Error(`removing objects failed: ${rmError.message}`);
  }

  console.log(
    `\n${doomed.length} object${doomed.length === 1 ? "" : "s"} ` +
      `${apply ? "removed" : "would be removed"}, ${kb(bytes)} reclaimed` +
      (tooYoung ? `, ${tooYoung} folder(s) skipped as too recent` : "") +
      ".",
  );

  if (strays.length) {
    console.log(
      `\n⚠️  ${strays.length} unreferenced file(s) inside LIVE folders. Reported, not touched —` +
        ` check each before removing it by hand:`,
    );
    for (const s of strays) console.log(`  ${s}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
