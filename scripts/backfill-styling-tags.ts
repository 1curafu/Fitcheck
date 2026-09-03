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
 * ⚠️ FILL, NEVER OVERWRITE. The query below selects only rows where
 * `distressing is null`, but by the time this runs the OTHER four fields may
 * already carry a user's correction from the edit sheet — the row's own
 * `distressing` can be null while everything else on it is a real, edited
 * value (a user can correct branding/length/bulk/accent_color without ever
 * touching Wear). Each field is written only where the CURRENT row value is
 * null (`item.field ?? tags.field`); a user correction is never replaced by
 * a fresh model guess, on this run or any re-run.
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
 * `distressing is null` are selected, so an already-backfilled item is
 * never re-billed.
 *
 * ⚠️ The sentinel is `distressing`, NOT `accent_color` and NOT `branding`.
 * Measured against the real local closet, `accent_color` turned out to be a
 * bad eligibility check: it is `null` both when a row has never been
 * processed AND when a row WAS processed and the garment legitimately has no
 * accent — a plain single-colour tee has none to report, and that is the
 * common case, not the exception. Selecting on `accent_color is null` would
 * re-tag (and re-bill) most of an already-backfilled closet on every re-run.
 * `branding` was tried next and is ALSO unsafe as a sentinel on its own: it
 * is `.nullable()` in `TagSchema`, and the model genuinely returns null for
 * it sometimes (3 of 26 rows in this closet's first run). `distressing` is
 * the one column this script does not merely pass through — see the `??
 * "None"` coercion below — so it is the only column guaranteed non-null on
 * every row the script has touched, regardless of what the model returns.
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
  distressing?: string | null;
  cutout_url: string | null;
  category?: string | null;
  accent_color?: string | null;
  branding?: string | null;
  length?: string | null;
  bulk?: string | null;
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
 *
 * `onBilled` fires the instant `tagItem` returns successfully — i.e. the
 * instant the call is actually billed by Anthropic — NOT when the later DB
 * write succeeds. A cost total driven by `"filled"` would silently drop the
 * spend for any item where tagging succeeded but the subsequent `.update()`
 * failed; that money was still spent.
 */
export async function backfillItem(
  item: BackfillRow,
  onBilled?: () => void,
): Promise<"filled" | "skipped" | "failed"> {
  // Already backfilled — re-running the script must cost nothing.
  // `distressing` is the sentinel — see the file header for why it, and only
  // it, is safe to rely on here.
  if (item.distressing != null) return "skipped";
  // Nothing to tag. Not a failure: this item just predates cutouts entirely
  // (background removal failed, or a legacy row was never migrated).
  if (!item.cutout_url) return "skipped";

  try {
    const { data: blob, error: dlError } = await db.storage.from("wardrobe").download(item.cutout_url);
    if (dlError || !blob) return "failed";

    const buf = Buffer.from(await blob.arrayBuffer());
    const tags = await tagItem(buf.toString("base64"), mediaTypeFor(item.cutout_url));
    onBilled?.(); // the API call succeeded here — this item is billed regardless of what happens next

    // ⚠️ `fit` is intentionally absent from this object — see file header.
    // ⚠️ Fill, never overwrite. A user may have corrected any of these in the
    // edit sheet, and a re-run must not silently replace their answer with a
    // fresh model guess. Only genuinely-empty fields are written.
    const { error } = await db
      .from("items")
      .update({
        accent_color: item.accent_color ?? tags.accent_color,
        branding: item.branding ?? tags.branding,
        length: item.length ?? tags.length,
        // Same footwear-only gate as tagsToItemRow (lib/ai/parse-tags.ts): a
        // prompt saying "FOOTWEAR ONLY" is guidance, not an invariant, and the
        // mock in this suite's own tests proves a non-Shoes item can carry a
        // bulk value from the model.
        bulk: item.bulk ?? (tags.category === "Shoes" ? tags.bulk : null),
        // ⚠️ Coerced, not passed through. This column is the sentinel that
        // marks a row as processed, so it must ALWAYS be non-null after a
        // successful run — otherwise the row reads as never-processed and
        // gets re-tagged and re-billed forever. The model is permitted to
        // return null here (`z.enum(DISTRESSING).nullable()`), and in this
        // closet it returned null for `branding` on 3 of 26 rows, so "the
        // model always fills it" is not a property we may rely on for the
        // sentinel column specifically.
        // Semantically safe: the prompt already instructs "None for a clean
        // garment", so null and "None" carry the same meaning for this field.
        // `item.distressing` is never non-null here — the caller only reaches
        // this branch when `distressing is null` was true — but `?? "None"`
        // is kept for symmetry with the other fields and as a belt-and-braces
        // guard on the sentinel specifically.
        distressing: item.distressing ?? tags.distressing ?? "None",
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
    .select("id, distressing, cutout_url, category, accent_color, branding, length, bulk")
    .is("distressing", null)
    .not("cutout_url", "is", null);
  if (error) throw error;

  const total = items?.length ?? 0;
  console.log(`${total} item${total === 1 ? "" : "s"} to backfill, ~$${(total * COST_PER_ITEM).toFixed(2)} total.\n`);

  let filled = 0;
  let skipped = 0;
  let failed = 0;
  // Tracked separately from `filled`: billed the moment tagItem succeeds,
  // not the moment the write succeeds — see backfillItem's onBilled doc.
  let billed = 0;

  for (const [i, item] of (items ?? []).entries()) {
    const result = await backfillItem(item, () => billed++);
    if (result === "filled") filled++;
    else if (result === "skipped") skipped++;
    else failed++;

    console.log(
      `  [${i + 1}/${total}] ${item.id}: ${result}` +
        `  (running: ${filled} filled, ~$${(billed * COST_PER_ITEM).toFixed(2)} spent)`,
    );
  }

  console.log(
    `\nDone. ${filled} filled, ${skipped} skipped, ${failed} failed.` +
      ` ~$${(billed * COST_PER_ITEM).toFixed(2)} spent.`,
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
