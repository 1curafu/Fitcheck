/**
 * One-off: backfill the five styling fields a photo CAN answer onto items
 * that predate the 20260902090000_item_styling_detail.sql migration, by
 * re-running the vision tagger over each item's stored cutout.
 *
 * ⚠️ `fit` IS NEVER WRITTEN HERE. It is the one field the user answers rather
 * than the model — "oversized" is relative to a body the cutout photo does
 * not contain. `tagItem` still drafts a guess for it (the same call the
 * capture flow makes), but this script discards that guess and writes only
 * `accent_color`, `branding`, `length`, `bulk`, `distressing`. A later plan
 * gates its proportion rules on how many items have a REAL `fit`; a
 * backfilled guess would make that measurement a lie.
 *
 * Usage: npx tsx scripts/backfill-styling-tags.ts
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * ⚠️ Service-role. Cutouts live in the PRIVATE `wardrobe` storage bucket and
 * this script runs outside any user session, so the anon key 403s on
 * download — service-role is the deliberate exception here, and it crosses
 * all users' rows. It lives in scripts/ and must never be imported by app
 * code (app code always goes through RLS via lib/supabase/server.ts).
 *
 * Cost: ~$0.002/item, one time. Re-running is free — only rows where
 * `accent_color is null` are selected, so an already-backfilled item is
 * never re-billed.
 */
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { tagItem } from "@/lib/ai/tag-item";

const COST_PER_ITEM = 0.002;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type BackfillRow = {
  id: string;
  accent_color?: string | null;
  cutout_url: string | null;
};

/**
 * The upload pipeline stores a cutout as `cutout.webp` or `cutout.png`
 * (`lib/images/encode.ts`); older rows can also be a plain `.jpg`. `tagItem`
 * only accepts the three media types Anthropic's vision endpoint supports.
 */
function mediaTypeFor(path: string): "image/webp" | "image/png" | "image/jpeg" {
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  return "image/jpeg";
}

/**
 * Tag one item's stored cutout and write back the five fields a photo can
 * answer. Never throws — a single bad cutout (missing from storage, a
 * tagger error, a write failure) must not abort the whole run, so every
 * failure mode here resolves to `"failed"` instead of rejecting.
 */
export async function backfillItem(item: BackfillRow): Promise<"filled" | "skipped" | "failed"> {
  // Already backfilled — re-running the script must cost nothing.
  if (item.accent_color != null) return "skipped";
  // Nothing to tag. Not a failure: this item just predates cutouts entirely
  // (background removal failed, or a legacy row was never migrated).
  if (!item.cutout_url) return "skipped";

  try {
    const { data: blob, error: dlError } = await db.storage.from("wardrobe").download(item.cutout_url);
    if (dlError || !blob) return "failed";

    const buf = Buffer.from(await blob.arrayBuffer());
    const tags = await tagItem(buf.toString("base64"), mediaTypeFor(item.cutout_url));

    // ⚠️ `fit` is intentionally absent from this object — see file header.
    const { error } = await db
      .from("items")
      .update({
        accent_color: tags.accent_color,
        branding: tags.branding,
        length: tags.length,
        bulk: tags.bulk,
        distressing: tags.distressing,
      })
      .eq("id", item.id);
    if (error) return "failed";

    return "filled";
  } catch {
    return "failed";
  }
}

async function main() {
  // Exactly the rows Step 1 specifies: untagged AND has something to tag.
  // Archived items are included on purpose (same precedent as
  // backfill-item-tags.ts / backfill-thumbs.ts) — an archived item can be
  // restored, and it would come back missing the fields every other item has.
  const { data: items, error } = await db
    .from("items")
    .select("id, accent_color, cutout_url")
    .is("accent_color", null)
    .not("cutout_url", "is", null);
  if (error) throw error;

  const total = items?.length ?? 0;
  console.log(`${total} item${total === 1 ? "" : "s"} to backfill, ~$${(total * COST_PER_ITEM).toFixed(2)} total.\n`);

  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, item] of (items ?? []).entries()) {
    const result = await backfillItem(item);
    if (result === "filled") filled++;
    else if (result === "skipped") skipped++;
    else failed++;

    console.log(
      `  [${i + 1}/${total}] ${item.id}: ${result}` +
        `  (running: ${filled} filled, ~$${(filled * COST_PER_ITEM).toFixed(2)} spent)`,
    );
  }

  console.log(
    `\nDone. ${filled} filled, ${skipped} skipped, ${failed} failed.` +
      ` ~$${(filled * COST_PER_ITEM).toFixed(2)} spent.`,
  );
}

// Run only when executed directly (`npx tsx scripts/backfill-styling-tags.ts`),
// not when imported by the test suite for `backfillItem`.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
