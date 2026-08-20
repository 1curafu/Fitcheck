import { test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Task 0 of the instant-navigations plan: numbers BEFORE any flag.
 *
 * Not an assertion — a measurement. It prints and never fails, so it can be
 * re-run after the flags land and the two sets compared.
 *
 * ⚠️ Each navigation gets a FRESH page. Reusing one across measurements meant a
 * `goto` racing the app's own in-flight client-side navigation, which
 * Playwright aborts — the measurement was fighting the thing it measured.
 */
const NAVS: { name: string; from: string; link: RegExp }[] = [
  { name: "nav → Closet", from: "/generate", link: /closet/i },
  { name: "nav → Diary", from: "/closet", link: /diary/i },
  { name: "nav → Profile", from: "/closet", link: /profile/i },
  { name: "nav → Stylist", from: "/closet", link: /stylist/i },
];

// Tagged @measure: a measurement, not a test. Excluded from the normal run
// (`--grep-invert @measure`) so CI does not spend 7s printing numbers nobody
// reads. Run deliberately: `npx playwright test --grep @measure`.
test("measure navigation @measure", async ({ browser }) => {
  console.log("\n  --- navigation baseline (production build) ---");

  for (const nav of NAVS) {
    const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });
    await page.goto(nav.from);
    await page.waitForLoadState("networkidle");

    const t0 = Date.now();
    await page.getByRole("link", { name: nav.link }).first().click();
    await page.waitForLoadState("networkidle");
    console.log(`  ${nav.name.padEnd(20)} ${Date.now() - t0}ms`);
    await page.close();
  }

  // The most-tapped path in the app.
  const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });
  await page.goto("/closet");
  await page.waitForLoadState("networkidle");
  const t = Date.now();
  await page.getByText("E2E Oxford Shirt").first().click();
  await page.waitForLoadState("networkidle");
  console.log(`  ${"grid → item".padEnd(20)} ${Date.now() - t}ms\n`);
  await page.close();
});
