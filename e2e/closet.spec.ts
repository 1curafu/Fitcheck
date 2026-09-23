import { test, expect } from "@playwright/test";
import { admin, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Closet grid → item detail → back. The most-tapped path in the app, and the
 * one `2026-08-19-instant-navigations.md` is about to rewrite — so it wants a
 * guard before that work starts, not after.
 */
test("an item opens from the grid and the back button returns to it", async ({ page }) => {
  await page.goto("/closet");
  await page.getByText("E2E Oxford Shirt").first().click();

  await expect(page).toHaveURL(/\/closet\/[0-9a-f-]{36}/);
  // ⚠️ `.first()`: the name appears more than once on the detail screen — the
  // serif title and again in the spec rows. Strict mode rejects a locator that
  // matches two elements, which reads like a missing element and is not one.
  await expect(page.getByText("E2E Oxford Shirt").first()).toBeVisible();

  // ⚠️ The back button used to be DEAD on a deep link, refresh or PWA cold
  // start — `router.back()` with no history does nothing (PR #21). It falls out
  // to a real destination instead, and this pins that it still does.
  await page.getByLabel(/back/i).click();
  await expect(page).toHaveURL(/\/closet$/);
});

test("cost-per-wear is absent, not €0.00, when the piece has no price", async ({ page }) => {
  // The seeded closet has no prices. `itemWearStats` returns null rather than
  // formatting a division by zero, and the tile hides. "€0.00 per wear" would
  // be stating something false about a piece nobody has priced.
  await page.goto("/closet");
  await page.getByText("E2E Oxford Shirt").first().click();
  await expect(page.getByText(/E2E Oxford Shirt/).first()).toBeVisible();
  await expect(page.getByText(/per wear/i)).toHaveCount(0);
});

test("a deep link into an item renders without a grid visit first", async ({ page }) => {
  // The PWA cold-start path: no history, no prior navigation.
  await page.goto("/closet");
  const href = await page
    .getByText("E2E Oxford Shirt")
    .first()
    .locator("xpath=ancestor::a")
    .getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(href!);
  await expect(page.getByText("E2E Oxford Shirt").first()).toBeVisible();
  await page.getByLabel(/back/i).click();
  await expect(page).toHaveURL(/\/closet$/);
});

test("removing a piece asks in the app's own sheet, then takes it out of the closet", async ({ page }) => {
  const piece = "E2E Cable Polo";
  // A native confirm() would surface here and block the journey; the sheet must be the only question asked.
  page.on("dialog", (dialog) => {
    throw new Error(`unexpected browser dialog: ${dialog.message()}`);
  });

  try {
    await page.goto("/closet");
    await page.getByText(piece).first().click();
    await expect(page).toHaveURL(/\/closet\/[0-9a-f-]{36}/);

    await page.getByRole("button", { name: /archive/i }).click();
    const sheet = page.getByRole("dialog", { name: /remove this piece/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(/photos stay saved with your account/i)).toBeVisible();

    // Cancel leaves everything as it was.
    await sheet.getByRole("button", { name: /^cancel$/i }).click();
    await expect(sheet).toBeHidden();

    await page.getByRole("button", { name: /archive/i }).click();
    await page.getByRole("dialog", { name: /remove this piece/i }).getByRole("button", { name: /remove from closet/i }).click();
    await expect(page).toHaveURL(/\/closet$/);
    // Visible matches only: routes stay mounted but hidden (React Activity), so the item screen just left still holds
    // the name in the DOM. What matters is that the closet grid no longer shows it.
    await expect(page.getByText(piece).filter({ visible: true })).toHaveCount(0);
  } finally {
    // One seeded closet serves every spec: put the piece back whatever happened above.
    await admin().from("items").update({ archived: false }).eq("user_id", await testUserId()).eq("name", piece);
  }
});
