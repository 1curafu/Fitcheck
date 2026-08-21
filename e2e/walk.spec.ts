import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Visit every route so the dev server has a chance to raise its Cache
 * Components validation insights. Asserts nothing itself — `scripts/check-insights.sh`
 * reads the dev-server log afterwards and fails on anything Next flagged.
 *
 * ⚠️ Tagged `@insights` and excluded from `npm run e2e`: it needs `next dev`,
 * whereas the rest of the suite runs against a production build.
 *
 * ⚠️ It MUST run signed in. An unauthenticated walk redirects every route to
 * `/` and reports a clean log while having visited nothing — which is exactly
 * what happened on the first attempt, because the storageState cookies are
 * scoped to `127.0.0.1` and the walk used `localhost`.
 */
const ROUTES = [
  "/",
  "/closet",
  "/generate",
  "/calendar",
  "/profile",
  "/settings",
  "/stats",
  "/closet/upload",
  "/onboarding",
];

test("walk every route @insights", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  // The two dynamic-param routes, reached the way a user reaches them.
  await page.goto("/closet");
  await page
    .getByText("E2E Oxford Shirt")
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(1500);
});
