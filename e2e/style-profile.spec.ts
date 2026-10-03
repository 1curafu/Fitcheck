import { test, expect } from "@playwright/test";
import { admin, reseed, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

/** The seed pins the profile to Europe/Zurich, so "today" is the Zurich date (Decision 5). */
const zurichToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date());

test.afterEach(async () => {
  await reseed(); // restores the item's tags and the quiz answers
});

test("a no-go ticked in the Style profile never reaches today's looks", async ({ page }) => {
  test.setTimeout(120_000);
  const db = admin();
  const userId = await testUserId();
  const today = zurichToday();

  /**
   * ⚠️ Deterministic by construction: the ripped pair is the ONLY bottom (the wool pair is archived for this
   * test). Before the no-go every look must wear it; after it, nothing can — so the stylist has to show the
   * no-go empty state. With two bottoms, ranking could skip the ripped pair by chance and the test would
   * pass even with the filter deleted.
   */
  const profile = await db.from("profiles")
    .update({ palette: "Neutrals", fit: "Tailored", dress_codes: ["Smart casual"], occasions: ["Work"], nogos: [] })
    .eq("id", userId);
  expect(profile.error).toBeNull();
  const archived = await db.from("items").update({ archived: true }).eq("user_id", userId).eq("name", "E2E Wool Trousers");
  expect(archived.error).toBeNull();
  const { data: ripped, error } = await db.from("items").update({ distressing: "Ripped" })
    .eq("user_id", userId).eq("name", "E2E Cotton Trousers").select("id").single();
  expect(error).toBeNull();
  // Today's stored looks may predate this setup and still hold the archived pair; start from a clean day.
  const stale = await db.from("outfits").select("id").eq("user_id", userId).eq("generated_on", today);
  const staleIds = (stale.data ?? []).map((o) => o.id);
  if (staleIds.length) {
    await db.from("outfit_items").delete().in("outfit_id", staleIds);
    await db.from("outfits").delete().in("id", staleIds);
  }

  await page.goto("/generate?occasion=work");
  await expect(page.getByText(/Test Look 1/i).first()).toBeVisible({ timeout: 30_000 });
  const { data: before } = await db.from("outfits")
    .select("id, outfit_items(item_id)").eq("user_id", userId).eq("generated_on", today);
  expect(before!.length).toBeGreaterThan(0);
  expect(before!.flatMap((l) => l.outfit_items.map((p: { item_id: string }) => p.item_id))).toContain(ripped!.id);

  await page.goto("/settings");
  await page.getByRole("link", { name: /your style answers/i }).click();
  await expect(page).toHaveURL(/\/settings\/style$/);
  await page.getByRole("button", { name: "Ripped denim" }).click();
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible();

  const cleared = await db.from("outfits").select("id").eq("user_id", userId).eq("generated_on", today);
  expect(cleared.data).toEqual([]);

  await page.goto("/generate?occasion=work");
  // The no-go emptied the only bottom slot: the stylist says the no-gos did it (not "add a pair") and links back.
  await expect(page.getByText(/no-gos rule out every option/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /open style profile/i })).toHaveAttribute("href", /\/settings\/style$/);
  const after = await db.from("outfits").select("id").eq("user_id", userId).eq("generated_on", today);
  expect(after.data).toEqual([]);
});

test("the Profile style card opens Style DNA, which leads on to the editor", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: /old money/i }).click();
  await expect(page).toHaveURL(/\/style-dna$/);
  await page.getByRole("link", { name: /your style answers/i }).click();
  await expect(page).toHaveURL(/\/settings\/style$/);
  await expect(page.getByRole("heading", { name: "Style profile" }).first()).toBeVisible();
});
