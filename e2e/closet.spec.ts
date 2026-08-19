import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Closet grid → item detail → back. The most-tapped path in the app, and the
 * one `2026-08-19-instant-navigations.md` is about to rewrite — so it wants a
 * guard before that work starts, not after.
 */
test("an item opens from the grid and the back button returns to it", async ({ page }) => {
  await page.goto("/closet");
  await page.getByText("E2E Oxford Shirt").click();

  await expect(page).toHaveURL(/\/closet\/[0-9a-f-]{36}/);
  await expect(page.getByText("E2E Oxford Shirt")).toBeVisible();

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
  await page.getByText("E2E Oxford Shirt").click();
  await expect(page.getByText(/E2E Oxford Shirt/).first()).toBeVisible();
  await expect(page.getByText(/per wear/i)).toHaveCount(0);
});

test("a deep link into an item renders without a grid visit first", async ({ page }) => {
  // The PWA cold-start path: no history, no prior navigation.
  await page.goto("/closet");
  const href = await page.getByText("E2E Oxford Shirt").locator("xpath=ancestor::a").getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(href!);
  await expect(page.getByText("E2E Oxford Shirt")).toBeVisible();
  await page.getByLabel(/back/i).click();
  await expect(page).toHaveURL(/\/closet$/);
});
