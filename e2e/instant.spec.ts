import { test, expect } from "@playwright/test";
import { instant } from "@next/playwright";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * What is on screen WITHOUT waiting for the network.
 *
 * ⚠️ This is the only honest measure of the Instant Navigations work, and the
 * reason the plan's Task 0 timings were misleading: `waitForLoadState` waits
 * for the streamed body too, so a converted route and an unconverted one time
 * almost identically. `instant()` asserts what the user sees the moment they
 * tap, which is the whole point of a prefetched shell.
 *
 * It is also the regression guard for the entire migration. A `cookies()` read
 * added to a shared layout, or a `<Suspense>` boundary moved in a later
 * refactor, silently de-opts a route back to blocking — and nothing else in CI
 * would notice.
 */
test("the closet's shell is on screen before any data arrives", async ({ page }) => {
  await page.goto("/generate");

  await instant(page, async () => {
    await page.getByRole("link", { name: /closet/i }).first().click();
    // The shell: chrome only, no user data. If this ever needs the network,
    // the route has been de-opted back to blocking.
    await expect(page.getByRole("heading", { name: /the closet/i })).toBeVisible();
  });

  // And the body still arrives.
  await expect(page.getByText("E2E Oxford Shirt").first()).toBeVisible();
});

/**
 * ⚠️ Task 5: routes are preserved with React `<Activity hidden>` now, not
 * unmounted, so `useState` survives navigation. Every sheet in this app opens
 * from local state, and the migration guide predicts they stay open when you
 * navigate away and back.
 */
test("a sheet does not survive leaving the screen", async ({ page }) => {
  await page.goto("/closet");
  await page.getByRole("link", { name: /stylist/i }).first().click();
  await expect(page).toHaveURL(/\/generate/);

  await page.getByRole("button", { name: /refine/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  /**
   * ⚠️ The BACK BUTTON, not a nav tap. A modal sheet's backdrop covers the
   * bottom nav by design, so tapping a tab with the sheet open is not a path a
   * user has — the first version of this test timed out trying, which was the
   * sheet working correctly rather than a bug.
   *
   * Back IS reachable with a sheet open (the phone gesture, the browser
   * control), which makes it the honest way to ask whether preserved state
   * resurrects a sheet the user already left.
   */
  await page.goBack();
  await expect(page).toHaveURL(/\/closet$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/generate/);

  await expect(page.getByRole("dialog")).toHaveCount(0);
});
