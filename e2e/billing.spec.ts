import { expect, test } from "@playwright/test";
import { admin, testUserId, setTier } from "./helpers";
import uk from "../messages/uk.json";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Billing journeys through the stub gateway (FITCHECK_STUB_STRIPE, playwright.config.ts): everything except the
 * network call to Stripe. The real Checkout is exercised in the sandbox run before release (plan Task 11).
 */
test.describe("billing", () => {
  // The seeded user is Pro (e2e/seed.ts); every test restores that so later specs see the world they expect.
  test.afterEach(async () => setTier("pro"));

  test("Go Pro needs the withdrawal waiver, then goes to checkout", async ({ page }) => {
    await setTier("free");
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

  test("localized checkout and portal return to the same language", async ({ page }) => {
    const db = admin(), userId = await testUserId();
    const before = await db.from("profiles").select("stripe_customer_id").eq("id", userId).single();
    try {
      await setTier("free");
      await page.goto("/uk/profile");
      await page.getByRole("button", { name: /fitcheck pro/i }).click();
      const sheet = page.getByRole("dialog");
      await sheet.getByText(uk.billing.waiver, { exact: true }).click();
      await sheet.getByRole("button", { name: uk.billing.goPro, exact: true }).click();
      await expect(page).toHaveURL(/\/uk\/profile\?pro=stub-checkout$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "uk");
      await setTier("pro");
      await page.goto("/en-gb/profile");
      await page.getByRole("button", { name: /manage subscription/i }).click();
      await expect(page).toHaveURL(/\/en-gb\/profile\?pro=stub-portal$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
    } finally {
      await db.from("profiles").update({ stripe_customer_id: before.data?.stripe_customer_id ?? null }).eq("id", userId);
      await page.context().clearCookies({ name: "NEXT_LOCALE" });
    }
  });
});
