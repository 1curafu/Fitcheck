import { test, expect } from "@playwright/test";
import { setTier, clearWears, reseed, admin, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Wear Stats, both tiers and the empty state.
 *
 * ⚠️ Every test here mutates the seeded world and MUST restore it. The suite is
 * `workers: 1` so that is safe, but a spec that left the tier on `free` would
 * silently change what every later spec asserts.
 */
test.describe.serial("wear stats", () => {
  test.afterAll(async () => {
    await reseed();
  });

  test("a Pro user sees the analysis", async ({ page }) => {
    await setTier("pro");
    await page.goto("/stats");
    await expect(page.getByText(/most worn/i)).toBeVisible();
    await expect(page.getByText(/E2E Oxford Shirt/).first()).toBeVisible();
    await expect(page.getByText(/gathering dust/i)).toBeVisible();
  });

  test("buying advice names real partners and counts owned pieces", async ({ page }) => {
    await setTier("pro");
    await page.goto("/stats");

    await expect(page.getByText("What to buy next")).toBeVisible();
    const cards = page.getByTestId("advisor-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    expect(await cards.count()).toBeLessThanOrEqual(3);
    for (const card of await cards.all()) {
      await expect(card.getByText(/Goes with \d+ of your pieces/)).toBeVisible();
      await expect(card.getByText(/Best with your E2E .+ and E2E /)).toBeVisible();
    }
    await page.screenshot({ path: "e2e/.artifacts/wardrobe-advisor-stats.png", fullPage: true });
  });

  test("missing shoes keeps the existing slot answer", async ({ page }) => {
    await setTier("pro");
    const { error } = await admin().from("items").update({ archived: true }).eq("user_id", await testUserId()).eq("category", "Shoes");
    if (error) throw error;
    try {
      await page.goto("/stats");
      const card = page.locator("section", { hasText: /your biggest gap/i });
      await expect(card).toBeVisible();
      await expect(card.getByText(/can't build a look without one/i)).toBeVisible();
      expect(await card.innerText()).toMatch(/sneakers|loafers|shoes/i);
      await expect(page.getByTestId("advisor-card")).toHaveCount(0);
    } finally {
      await reseed();
    }
  });

  test("a free user sees their own numbers but not the analysis", async ({ page }) => {
    // "Facts free, analysis Pro" — the user's decision of 2026-08-17. The pitch
    // is made WITH their data, which is MONETISATION.md's whole argument.
    await setTier("free");
    await page.goto("/stats");

    await expect(page.getByText(/closet value/i)).toBeVisible();
    await expect(page.getByText(/total wears/i)).toBeVisible();

    await expect(page.getByText(/E2E Oxford Shirt/)).toHaveCount(0);
    await expect(page.getByText(/adds \d+% more outfits/i)).toHaveCount(0);

    // Named and tappable, never hidden: nobody buys what they never reached for.
    await expect(page.getByText(/most worn/i)).toBeVisible();
    await expect(page.getByText(/what to buy next/i)).toBeVisible();
    await expect(page.getByTestId("advisor-card")).toHaveCount(0);
  });

  test("a locked section opens the upgrade sheet, above the bottom nav", async ({ page }) => {
    await setTier("free");
    await page.goto("/stats");
    await page.getByRole("button", { name: /what to buy next/i }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    /**
     * ⚠️ `MobileNav` is `z-50` and renders AFTER the page content, so at equal
     * or lower z-index it paints straight over a sheet's primary action. That
     * shipped once already (`RefineSheet`). Asserting the sheet's action is
     * clickable is the honest version of "it is above the nav" — a z-index
     * assertion would pass while the element was still covered.
     */
    const gotIt = sheet.getByRole("button").last();
    await expect(gotIt).toBeVisible();
    await gotIt.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("no wears at all explains itself instead of showing zeroes", async ({ page }) => {
    await setTier("pro");
    await clearWears();
    await page.goto("/stats");

    await expect(page.getByText(/wear a look/i)).toBeVisible();
    // Not a wall of empty sections.
    await expect(page.getByText(/most worn/i)).toHaveCount(0);
    await expect(page.getByText(/gathering dust/i)).toHaveCount(0);
  });
});
