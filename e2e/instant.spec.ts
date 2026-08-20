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
