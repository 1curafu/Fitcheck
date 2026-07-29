/**
 * One-off: normalise legacy materials and report missing `texture` for
 * pre-existing items.
 *
 * Pass 1 is free (pure string mapping). Pass 2 — re-tagging via Haiku to fill
 * `texture` — is deliberately NOT automatic: it costs roughly $0.002 per item,
 * and running it accidentally on every developer machine is worse than leaving
 * `texture` null, which every consumer already treats as "no opinion".
 *
 * Usage: npx tsx scripts/backfill-item-tags.ts [--dry-run]
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * This is the only place in the project that uses the service-role key — it
 * crosses all users' rows, so it lives in scripts/ and must never be imported
 * by app code.
 */
import { createClient } from "@supabase/supabase-js";
import { normalizeMaterial } from "../lib/closet/normalize-material";

const dryRun = process.argv.includes("--dry-run");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // Archived rows are included on purpose: an archived item can be restored,
  // and it would come back with a material the edit screen cannot offer.
  const { data: items, error } = await db.from("items").select("id, material, texture");
  if (error) throw error;

  let normalised = 0;
  for (const it of items ?? []) {
    const next = normalizeMaterial(it.material);
    if (next === it.material) continue;
    normalised++;
    console.log(`${it.id}: material ${JSON.stringify(it.material)} → ${JSON.stringify(next)}`);
    if (!dryRun) {
      const { error: e } = await db.from("items").update({ material: next }).eq("id", it.id);
      if (e) throw e;
    }
  }

  const missingTexture = (items ?? []).filter((i) => !i.texture).length;
  console.log(
    `\n${normalised} material${normalised === 1 ? "" : "s"} ${dryRun ? "would be" : ""} normalised of ${items?.length ?? 0} rows.`,
  );
  console.log(`${missingTexture} items still have no texture.`);
  console.log(
    "Texture backfill re-tags each item via Haiku — run that only when you want to spend it.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
