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
const SHELLS: { name: string; from: string; link: RegExp; heading: RegExp }[] = [
  { name: "closet", from: "/generate", link: /closet/i, heading: /the closet/i },
  { name: "stylist", from: "/closet", link: /stylist/i, heading: /today's looks/i },
  { name: "diary", from: "/closet", link: /diary/i, heading: /fit diary/i },
];

for (const shell of SHELLS) {
  test(`${shell.name}: the shell is on screen before any data arrives`, async ({ page }) => {
    await page.goto(shell.from);
    await instant(page, async () => {
      await page.getByRole("link", { name: shell.link }).first().click();
      // ⚠️ The HEADING, not any text: a nav label or a link row in the streamed
      // body matches too, and asserting against those measures the wrong thing.
      await expect(page.getByRole("heading", { name: shell.heading }).first()).toBeVisible();
    });
  });
}

/**
 * The routes reached from a screen rather than the tab bar.
 *
 * ⚠️ Every route needs its own assertion. A shared choke point
 * (`lib/supabase/server.ts`) de-opts all of them at once, but a `<Suspense>`
 * boundary moved in a later refactor de-opts exactly one — and a guard covering
 * only the tab destinations would never notice.
 */
test("profile: the link rows are on screen before any data arrives", async ({ page }) => {
  // ⚠️ Not a heading — the design gives this screen no title, and inventing one
  // produced a header that painted and then vanished. The link rows ARE its
  // static content.
  await page.goto("/closet");
  await instant(page, async () => {
    await page.getByRole("link", { name: /profile/i }).first().click();
    await expect(page.getByRole("link", { name: /wear stats/i })).toBeVisible();
  });
});

test("stats: the shell is on screen before any data arrives", async ({ page }) => {
  await page.goto("/profile");
  await instant(page, async () => {
    await page.getByRole("link", { name: /wear stats/i }).first().click();
    await expect(page.getByRole("heading", { name: /wear stats/i })).toBeVisible();
  });
});

test("settings: the shell is on screen before any data arrives", async ({ page }) => {
  await page.goto("/profile");
  await instant(page, async () => {
    await page.getByRole("link", { name: /settings/i }).first().click();
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
  });
});

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

/**
 * ⚠️ Task 5 Step 1 asks for EACH sheet, not one. Four were fixed by inspection
 * after the Refine one was caught; reasoning is not evidence, and these are the
 * tests that make it so.
 */
test("the item-edit sheet does not survive leaving the screen", async ({ page }) => {
  await page.goto("/closet");
  await page.getByText("E2E Oxford Shirt").first().click();
  await page.getByRole("button", { name: /⋯|more|edit/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/closet$/);
  await page.goForward();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the location picker does not survive leaving settings", async ({ page }) => {
  await page.goto("/settings");
  await page.getByText(/rapperswil|zurich|location/i).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();
  await page.goForward();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

/**
 * ⚠️ Task 5 Step 4. `MobileNav` is `z-50` and renders AFTER the page content,
 * so at equal or lower z-index it paints straight over a sheet's primary
 * action. `RefineSheet` shipped exactly that bug once (`docs/STATE.md`), and it
 * is the sheet this migration touched — so its action must be genuinely
 * clickable, not merely present. A z-index assertion would pass while the
 * button was covered; a click will not.
 */
test("the refine sheet's action is reachable above the bottom nav", async ({ page }) => {
  await page.goto("/generate");
  await page.getByRole("button", { name: /refine/i }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  const apply = sheet.getByRole("button", { name: /show \d+ looks?/i });
  await expect(apply).toBeVisible();
  await apply.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
