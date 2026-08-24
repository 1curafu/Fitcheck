import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_USER, seedTestUser } from "./seed";

/**
 * Service-role helpers for the specs that need to change the world.
 *
 * ⚠️ Anything that mutates MUST restore, and the suite runs `workers: 1` /
 * `fullyParallel: false` so that is safe. Playwright shares one seeded user; a
 * spec that leaves the tier on `free` would silently change what every later
 * spec asserts.
 */
export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function testUserId(): Promise<string> {
  const { data } = await admin().auth.admin.listUsers();
  const found = data.users.find((u) => u.email === TEST_USER.email);
  if (!found) throw new Error("the seeded test user is missing — did global.setup run?");
  return found.id;
}

/** Flip the tier so gated surfaces can be photographed from both sides. */
export async function setTier(tier: "free" | "pro"): Promise<void> {
  const { error } = await admin().from("profiles").update({ tier }).eq("id", await testUserId());
  if (error) throw new Error(`setting tier=${tier} failed: ${error.message}`);
}

/** Remove every wear, so the zero-wear branch renders. Restore with `reseed`. */
export async function clearWears(): Promise<void> {
  const { error } = await admin().from("wear_logs").delete().eq("user_id", await testUserId());
  if (error) throw new Error(`clearing wears failed: ${error.message}`);
}

/** Put the world back exactly as `global.setup` left it. */
export async function reseed(): Promise<void> {
  await seedTestUser({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}

/**
 * ── Measurement fixtures (`@measure` only) ────────────────────────────────────
 *
 * ⚠️ **The seeded closet cannot measure bytes.** `seed.ts` uploads a 70-byte 1×1
 * PNG to every path, so the whole e2e wardrobe is ~1 kB. A before/after byte
 * comparison against it shows a triumphant ~0% change and means nothing — the
 * image-weight plan's own "287.8 kB for grid → item detail" was measured on the
 * developer's real closet, not on this seed.
 *
 * So the probe borrows real images: it copies an actual `cutout.webp` /
 * `original.jpg` pair already in the bucket over every seeded path, measures,
 * and restores the placeholders afterwards. Same rule as every other mutating
 * helper here — mutate, then put it back.
 *
 * These run ONLY under `npm run e2e:measure`, which CI excludes, so the suite's
 * runtime and CI's storage are untouched.
 */
type Pair = { cutout: Uint8Array; original: Uint8Array };

/** Find one real (non-seeded) item folder and download its two blobs. */
async function borrowRealPair(): Promise<Pair> {
  const db = admin();
  const testUser = await testUserId();
  const { data: owners, error } = await db.storage.from("wardrobe").list("");
  if (error) throw new Error(`listing the wardrobe bucket failed: ${error.message}`);

  for (const owner of owners ?? []) {
    if (owner.name === testUser) continue; // the seeded user's own 1×1s
    const { data: items } = await db.storage.from("wardrobe").list(owner.name);
    for (const item of items ?? []) {
      const base = `${owner.name}/${item.name}`;
      const cutout = await db.storage.from("wardrobe").download(`${base}/cutout.webp`);
      const original = await db.storage.from("wardrobe").download(`${base}/original.jpg`);
      if (cutout.error || original.error || !cutout.data || !original.data) continue;
      return {
        cutout: new Uint8Array(await cutout.data.arrayBuffer()),
        original: new Uint8Array(await original.data.arrayBuffer()),
      };
    }
  }

  /**
   * ⚠️ Loud, not silent. A quiet fallback to the 1×1 placeholders would report
   * "0.9 kB → 0.9 kB, no change" — a measurement bug that reads like a finding.
   * The same failure mode as the seed insert that failed silently and left
   * `/stats` rendering an empty MOST WORN header.
   */
  throw new Error(
    "no real wardrobe images found to borrow — the byte measurement needs a non-seeded closet " +
      "in local storage. Upload an item, or run this probe on a machine that has one.",
  );
}

/** Put real-sized images behind every seeded path. Restore with `reseed()`. */
export async function installRealisticImages(): Promise<{ cutout: number; original: number }> {
  const db = admin();
  const userId = await testUserId();
  const pair = await borrowRealPair();

  const { data: items, error } = await db.from("items").select("image_url, cutout_url").eq("user_id", userId);
  if (error) throw new Error(`reading the seeded closet failed: ${error.message}`);

  for (const item of items ?? []) {
    for (const [path, body, type] of [
      [item.cutout_url, pair.cutout, "image/webp"],
      [item.image_url, pair.original, "image/jpeg"],
    ] as const) {
      if (!path) continue;
      const { error: upErr } = await db.storage
        .from("wardrobe")
        .upload(path, body, { contentType: type, upsert: true });
      if (upErr) throw new Error(`installing a realistic image at ${path} failed: ${upErr.message}`);
    }
  }
  return { cutout: pair.cutout.length, original: pair.original.length };
}

/**
 * Log the seeded outfit as worn TODAY, so `/calendar` has a cell to render.
 *
 * ⚠️ **Without this the diary measures nothing.** The seed's only wear is fixed
 * at `2026-01-15` — deliberately, so "N days ago" cannot drift with the clock —
 * and `/calendar` renders the CURRENT month, so the probe saw zero images and
 * reported `0.0 kB`. That reads like the diary is already free and it is not;
 * it is the surface the image-weight plan calls the worst mismatch in the app.
 *
 * Measurement-only, and `reseed()` removes it.
 */
export async function logWearToday(): Promise<void> {
  const db = admin();
  const userId = await testUserId();
  const { data: outfit } = await db
    .from("outfits")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (!outfit) throw new Error("no seeded outfit to log a wear against");

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await db
    .from("wear_logs")
    .insert({ user_id: userId, outfit_id: outfit.id, worn_on: today, occasion: "work" });
  if (error) throw new Error(`logging today's wear failed: ${error.message}`);
}
