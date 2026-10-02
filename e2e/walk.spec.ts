import { test, expect } from "@playwright/test";

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
  "/settings/style",
  "/stats",
  "/closet/upload",
  "/closet/removed",
  "/onboarding",
  "/sign-in",
  "/support",
  // ⚠️ New routes must be added here or `npm run insights` passes without ever
  // visiting them — a green walk that proves nothing.
  "/packing",
  "/packing/new",
  "/l/AAAAAAAAAAAAAAAAAAAAAA",
];

test("walk every route @insights", async ({ page }) => {
  test.setTimeout(120_000); // Both locale trees include cold compilation and deliberate insight waits.
  for (const route of ["", "/uk"].flatMap(prefix => ROUTES.map(route => prefix + route))) {
    await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  // Reach an owned item in each locale; static shells alone do not exercise the body.
  for (const prefix of ["", "/uk"]) {
    await page.goto(`${prefix}/closet`);
    await page.getByText("E2E Oxford Shirt").first().click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/closet/[^/]+$`));
    await page.waitForTimeout(1500);
  }

  // The public page's ready branch is distinct from the unknown-token route.
  // The local insights fixture supplies a real token and cleans it up afterwards.
  const readyToken = process.env.INSIGHTS_READY_SHARE_TOKEN;
  if (readyToken) {
    for (const prefix of ["", "/uk"]) {
      await page.goto(`${prefix}/l/${readyToken}`);
      await expect(page.getByRole("img", { name: /Insights ready share/ })).toBeVisible();
    }
  }
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("walk the public routes @insights", async ({ page }) => {
    test.setTimeout(120_000);
    for (const route of ["/", "/sign-in", "/privacy", "/terms", "/support", "/uk", "/uk/sign-in", "/uk/privacy", "/uk/terms", "/uk/support"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  });
});
