import { test, expect } from "@playwright/test";
import { instant } from "@next/playwright";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * What is on screen WITHOUT waiting for the network.
 *
 * ⚠️ This is the only honest measure of the Instant Navigations work. The
 * plan's Task 0 timings (39–81ms) were misleading because `waitForLoadState`
 * waits for the streamed body too, so a converted route and an unconverted one
 * time almost identically. `instant()` asserts what the user sees the moment
 * they tap, which is the whole point of a prefetched shell.
 *
 * ⚠️ It is also the regression guard for the entire migration, and it needs one
 * assertion PER ROUTE. A `cookies()` read added to a shared layout de-opts
 * every route at once; a `<Suspense>` boundary moved in a later refactor
 * de-opts one — and a guard covering only `/closet` would miss the second.
 * `lib/supabase/server.ts` is exactly such a shared choke point, and it did in
 * fact de-opt all ten routes until `connection()` was added to it.
 */

/** Each converted route, and the piece of chrome that proves its shell arrived. */
const SHELLS: { name: string; from: string; link: RegExp; sees: RegExp }[] = [
  { name: "closet", from: "/generate", link: /closet/i, sees: /the closet/i },
  { name: "profile", from: "/closet", link: /profile/i, sees: /settings|style dna|wear stats/i },
  { name: "stylist", from: "/closet", link: /stylist/i, sees: /today's looks/i },
];

for (const shell of SHELLS) {
  test(`${shell.name}: the shell is on screen before any data arrives`, async ({ page }) => {
    await page.goto(shell.from);
    await instant(page, async () => {
      await page.getByRole("link", { name: shell.link }).first().click();
      await expect(page.getByText(shell.sees).first()).toBeVisible();
    });
  });
}

test("the closet's body still arrives after its shell", async ({ page }) => {
  // A shell that never fills would pass every assertion above and be useless.
  await page.goto("/generate");
  await page.getByRole("link", { name: /closet/i }).first().click();
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
   */
  await page.goBack();
  await expect(page).toHaveURL(/\/closet$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/generate/);

  await expect(page.getByRole("dialog")).toHaveCount(0);
});

/**
 * ⚠️ Re-verifies PR #21's fix, which Cache Components could plausibly have
 * broken: the look index and occasion live in the URL because opening a look
 * used to UNMOUNT `Stylist`. That unmount no longer happens, so the restore
 * effect now runs against preserved state rather than a fresh mount.
 */
test("the stylist keeps its occasion in the URL across a round trip", async ({ page }) => {
  await page.goto("/generate?occasion=weekend");
  await expect(page.getByText(/today's looks/i).first()).toBeVisible();

  await page.getByRole("link", { name: /closet/i }).first().click();
  await expect(page).toHaveURL(/\/closet$/);
  await page.goBack();

  // The occasion must survive, not fall back to the morning prediction.
  await expect(page).toHaveURL(/occasion=weekend/);
});
