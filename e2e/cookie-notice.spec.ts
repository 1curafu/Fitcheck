import { test, expect, type Locator, type Page } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * The cookie notice sits in the page flow at the top of the shell and pushes the screen down. The two full-bleed
 * screens float their Back/⋯ controls over the stage, so those controls must move down with their screen — not stay
 * pinned to the shell's top edge underneath the notice (seen on the item page, 2026-09-23).
 */
test.beforeEach(async ({ page }) => {
  // Show the notice regardless of what the shared session has dismissed.
  await page.addInitScript(() => window.localStorage.removeItem("fitcheck:cookie-notice"));
});

async function expectBelowNotice(page: Page, control: Locator) {
  const notice = page.getByRole("region", { name: "Cookie notice" });
  await expect(notice).toBeVisible();
  await expect(control).toBeVisible();
  const noticeBox = (await notice.boundingBox())!;
  const controlBox = (await control.boundingBox())!;
  expect(controlBox.y).toBeGreaterThanOrEqual(noticeBox.y + noticeBox.height);
}

test("the item page's Back and ⋯ controls sit below the cookie notice, not under it", async ({ page }) => {
  await page.goto("/closet");
  await page.getByText("E2E Oxford Shirt").first().click();
  await expect(page).toHaveURL(/\/closet\/[0-9a-f-]{36}/);

  await expectBelowNotice(page, page.getByRole("button", { name: "Back" }));
  await expectBelowNotice(page, page.getByRole("button", { name: "More" }));
});

test("the full-look page's Back control sits below the cookie notice, not under it", async ({ page }) => {
  await page.goto("/generate?occasion=work");
  await expect(page.getByText(/Test Look 1/i).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: /see the full look/i }).first().click();
  await expect(page).toHaveURL(/\/outfits\/[0-9a-f-]{36}/);

  await expectBelowNotice(page, page.getByRole("button", { name: "Back" }));
});
