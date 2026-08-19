import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The e2e user and their wardrobe.
 *
 * ⚠️ **A DEDICATED user, never the developer's.** On 2026-08-19 the only way to
 * photograph the zero-wear state was to reassign the developer's real
 * `wear_logs` rows to another profile and restore them by hand afterwards. This
 * file exists so that never has to happen again: the suite owns this user
 * completely and truncates their data before every run.
 */
export const TEST_USER = {
  email: "e2e@fitcheck.test",
  password: "e2e-password-not-a-secret",
};

/**
 * A closet with a deliberate SHAPE, not a realistic one.
 *
 * Shoes are the shallow slot on purpose, so the gap analysis has a stable,
 * assertable answer; there is exactly one coat so the cold pass is non-zero;
 * and everything is formality 3 so every occasion band admits every piece.
 * A wardrobe copied from real life would drift and take the assertions with it.
 */
const CLOSET = [
  { name: "E2E Oxford Shirt", category: "Tops", colors: ["white"], material: "Cotton", texture: "Flat" },
  { name: "E2E Linen Shirt", category: "Tops", colors: ["cream"], material: "Linen", texture: "Flat" },
  { name: "E2E Cable Polo", category: "Tops", colors: ["navy"], material: "Cotton", texture: "Cable knit" },
  { name: "E2E Wool Trousers", category: "Bottoms", colors: ["charcoal"], material: "Wool", texture: "Flat" },
  { name: "E2E Cotton Trousers", category: "Bottoms", colors: ["beige"], material: "Cotton", texture: "Flat" },
  { name: "E2E Leather Sneakers", category: "Shoes", colors: ["white"], material: "Leather", texture: "Flat" },
  { name: "E2E Overcoat", category: "Outerwear", colors: ["camel"], material: "Wool", texture: "Twill" },
];

/**
 * A 1×1 PNG, uploaded to every seeded path.
 *
 * The closet renders items through signed URLs; if the object is missing the
 * browser never fires `load` and `page.goto` hangs until the test times out.
 * One pixel is enough — the suite asserts layout and copy, not pixels.
 */
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function uploadPlaceholders(admin: SupabaseClient, paths: string[]): Promise<void> {
  for (const path of paths) {
    const { error } = await admin.storage
      .from("wardrobe")
      .upload(path, ONE_PIXEL_PNG, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`seeding storage object ${path} failed: ${error.message}`);
  }
}

async function ensureUser(admin: SupabaseClient): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
  });
  if (created?.user) return created.user.id;

  // Already exists — find them rather than failing. The suite is re-run far
  // more often than the user is created.
  if (!error?.message?.match(/already/i)) throw error ?? new Error("createUser failed");
  const { data: list } = await admin.auth.admin.listUsers();
  const found = list.users.find((u) => u.email === TEST_USER.email);
  if (!found) throw new Error("test user exists but could not be listed");
  return found.id;
}

/** Truncate and re-seed. Returns the user id so specs can address the rows. */
export async function seedTestUser(cfg: { url: string; service: string }): Promise<string> {
  const admin = createClient(cfg.url, cfg.service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userId = await ensureUser(admin);

  // Order matters: wear_logs and outfit_items hang off outfits, and items are
  // referenced by outfit_items. Deleting items first would violate the FKs.
  await admin.from("wear_logs").delete().eq("user_id", userId);
  await admin.from("outfits").delete().eq("user_id", userId);
  await admin.from("items").delete().eq("user_id", userId);

  const { error } = await admin.from("items").insert(
    CLOSET.map((c, i) => ({
      user_id: userId,
      name: c.name,
      /**
       * ⚠️ `image_url` is NOT NULL, and both image columns are STORAGE PATHS,
       * not URLs — the closet renders them through short-lived signed URLs
       * (`lib/storage/signed.ts`). **A real object must exist behind each
       * path**: the first version pointed at nothing, and `page.goto` then hung
       * until the 30s timeout waiting for `load`, because the images never
       * resolved. `uploadPlaceholders` puts a 1×1 PNG at every path.
       */
      image_url: `${userId}/e2e-${i}/original.jpg`,
      cutout_url: `${userId}/e2e-${i}/cutout.webp`,
      category: c.category,
      colors: c.colors,
      material: c.material,
      texture: c.texture,
      pattern: "solid",
      formality: 3,
      seasons: ["Spring", "Summer", "Autumn", "Winter"],
      archived: false,
    })),
  );
  if (error) throw new Error(`seeding the closet failed: ${error.message}`);

  await uploadPlaceholders(
    admin,
    CLOSET.flatMap((_, i) => [`${userId}/e2e-${i}/original.jpg`, `${userId}/e2e-${i}/cutout.webp`]),
  );

  /**
   * ⚠️ A WORN outfit, and the suite is much weaker without it.
   *
   * Found while writing the first spec: with no wear logs, `/stats` renders its
   * zero-wear branch, so Most worn and Gathering dust never render at all — and
   * the pluralisation guard could not have caught "Worn 1 times", which is one
   * of the two defects it exists for. A seed that only covers the empty path
   * silently makes half the assertions vacuous.
   *
   * Deliberately worn ONCE, so "Worn once" is exercised rather than "Worn 2
   * times". The plural branch is the one that already worked.
   */
  const { data: seeded } = await admin.from("items").select("id, category").eq("user_id", userId);
  const wornPieces = (seeded ?? []).filter((i) =>
    ["Tops", "Bottoms", "Shoes"].includes(i.category),
  );
  const { data: outfit } = await admin
    .from("outfits")
    .insert({
      user_id: userId,
      look_name: "E2E Seeded Look",
      occasion: "work",
      ai_reasoning: "Seeded so the wear-derived sections have something to render.",
      // No generated_on / look_index: this is HISTORY, not today's drop. Setting
      // them would make it the drop and collide with `outfits_daily_unique`.
    })
    .select("id")
    .single();

  if (outfit) {
    // ⚠️ `slot` is NOT NULL. The first version of this seed omitted it AND did
    // not check the error, so the insert failed silently, the outfit had zero
    // pieces, and `/stats` rendered a "MOST WORN" header with nothing under it.
    // **Check every seed error.** A seed that fails quietly makes every
    // assertion downstream vacuous while the suite still reports green — which
    // is exactly how it was found.
    const { error: pieceError } = await admin.from("outfit_items").insert(
      wornPieces.slice(0, 3).map((i) => ({
        outfit_id: outfit.id,
        item_id: i.id,
        slot: i.category,
      })),
    );
    if (pieceError) throw new Error(`seeding outfit_items failed: ${pieceError.message}`);

    const { error: wearError } = await admin.from("wear_logs").insert({
      user_id: userId,
      outfit_id: outfit.id,
      worn_on: "2026-01-15", // fixed, so "N days ago" cannot drift with the clock
      occasion: "work",
    });
    if (wearError) throw new Error(`seeding the wear log failed: ${wearError.message}`);
  } else {
    throw new Error("seeding the worn outfit failed");
  }

  // A known profile: pro, so gated surfaces are reachable, and a fixed
  // timezone so the local-date key (Decision 5) cannot drift with the runner.
  await admin
    .from("profiles")
    .update({
      tier: "pro",
      archetype: "Old Money",
      formality_min: 3,
      formality_max: 3,
      location_label: "Zurich",
      location_lat: 47.37,
      location_lon: 8.54,
      location_source: "city",
      location_timezone: "Europe/Zurich",
    })
    .eq("id", userId);

  return userId;
}
