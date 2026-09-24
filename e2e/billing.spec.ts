import { expect, test } from "@playwright/test";
import { setTier } from "./helpers";

/**
 * Billing journeys through the stub gateway (FITCHECK_STUB_STRIPE, playwright.config.ts): everything except the
 * network call to Stripe. The real Checkout is exercised in the sandbox run before release (plan Task 11).
 */
test.describe("billing", () => {
  test.afterEach(async () => setTier("free"));

  test("Go Pro needs the withdrawal waiver, then goes to checkout", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: /fitcheck pro/i }).click();
    const sheet = page.getByRole("dialog");
    const go = sheet.getByRole("button", { name: /^go pro$/i });
    await expect(sheet.getByRole("radio", { name: /annual/i })).toBeChecked();
    await expect(go).toBeDisabled();
    await sheet.getByText(/start pro now/i).click();
    await expect(go).toBeEnabled();
    await go.click();
    await expect(page).toHaveURL(/\/profile\?pro=stub-checkout/);
  });

  test("a Pro user can manage the subscription from profile and settings", async ({ page }) => {
    await setTier("pro");
    await page.goto("/profile");
    await expect(page.getByRole("button", { name: /manage subscription/i })).toBeVisible();
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: /manage subscription/i })).toBeVisible();
  });
});
