import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * The foundation's own proof: signed in, seeded, and rendering.
 *
 * If this fails, nothing else in the suite means anything — every other spec
 * assumes the session and the seeded closet from `global.setup.ts`.
 */
test("the seeded user is signed in and sees their closet", async ({ page }) => {
  await page.goto("/closet");
  // Redirected to "/" would mean the session cookies did not take.
  await expect(page).toHaveURL(/\/closet/);
  await expect(page.getByText(/E2E Oxford Shirt/i)).toBeVisible();
});

test("the daily drop renders three looks without spending a model call", async ({ page }) => {
  // FITCHECK_STUB_AI is set by the webServer config, so the names are the
  // stub's and are stable. Everything in FRONT of the model still ran.
  await page.goto("/generate?occasion=work");
  await expect(page.getByText(/Today's Looks/i)).toBeVisible();

  // `.first()` because a look's name appears TWICE by design — once as the
  // index tab and once as the byline under the "why" (the design's D3: the
  // look name IS the byline). Without it the locator matches two elements and
  // strict mode fails, which looks like a missing look and is not one.
  await expect(page.getByText(/Test Look 1/i).first()).toBeVisible({ timeout: 30_000 });

  // The real assertion: all three looks arrived, so `finalisePicks` kept three
  // distinct combos rather than collapsing them.
  for (const n of [1, 2, 3]) {
    await expect(page.getByText(new RegExp(`Test Look ${n}`, "i")).first()).toBeVisible();
  }
});

test("no rendered text says '1 things' where it means '1 thing'", async ({ page }) => {
  // One sweeping assertion instead of three specific ones. Both "1 coats" and
  // "Worn 1 times" shipped, and each was found by eye rather than by a test.
  for (const path of ["/closet", "/stats", "/profile"]) {
    await page.goto(path);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    expect(body, `bad pluralisation on ${path}`).not.toMatch(/\b1 [a-z]+s\b/);
  }
});
