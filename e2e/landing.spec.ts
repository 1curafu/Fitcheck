import { expect, test } from "@playwright/test";
import en from "../messages/en-US.json";
import de from "../messages/de.json";
import { admin, testUserId } from "./helpers";

test.describe("landing, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the promise, the CTA and a working sign-in path", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(en.home.hero.titleLead);
    await page.locator("#hero-cta").click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("button", { name: en.auth.google })).toBeVisible();
    await expect(page.getByPlaceholder(en.auth.emailPlaceholder)).toBeVisible();
  });

  test("every visible CTA points at sign-in", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.getByRole("link", { name: en.home.hero.cta }).evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) expect(href).toBe("/sign-in");
  });

  test("the tabs switch the example look", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: new RegExp(en.home.looks.blueStone.name) }).click();
    await expect(page.getByText(en.home.looks.blueStone.why)).toBeVisible();
  });

  test("German landing, German sign-in path", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(de.home.hero.titleLead);
    await expect(page.locator("#hero-cta")).toHaveAttribute("href", "/de/sign-in");
  });

  test("a protected page sends a signed-out visitor to sign-in", async ({ page }) => {
    await page.goto("/closet");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("no horizontal scroll at 375px in de", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/de");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test("desktop is wide on the landing; sign-in stays phone-width after it", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      expect(await page.locator("main:visible").evaluate((m) => m.getBoundingClientRect().width)).toBeGreaterThan(900);
      await page.getByRole("banner").getByRole("link", { name: en.home.nav.signIn }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      // React Activity keeps the landing mounted (hidden) after client navigation, so pick the visible <main>.
      expect(await page.locator("main:visible").evaluate((m) => m.getBoundingClientRect().width)).toBeLessThanOrEqual(440);
    } finally { await ctx.close(); }
  });
});

test.describe("landing, signed in", () => {
  test.use({ storageState: "e2e/.auth/state.json" });

  test("a signed-in visitor at / goes into the app, not the marketing page", async ({ page }) => {
    // The seeded user has not finished onboarding, so the app's first stop is the quiz — as it was for the old welcome screen.
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("the redirect happens before any HTML: a signed-in / never paints the marketing page", async ({ page }) => {
    const res = await page.request.get("/", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(new URL(res.headers()["location"]!, "http://x").pathname).toBe("/onboarding");
  });

  test("/sign-in also goes into the app", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("an onboarded user opening / — the home-screen launch — lands in the closet", async ({ page }) => {
    const db = admin(), id = await testUserId();
    const before = await db.from("profiles").select("onboarded_at").eq("id", id).single();
    expect(before.error).toBeNull();
    const set = await db.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", id);
    expect(set.error).toBeNull();
    try {
      await page.goto("/");
      await expect(page).toHaveURL(/\/closet$/);
    } finally {
      const restored = await db.from("profiles").update({ onboarded_at: before.data?.onboarded_at ?? null }).eq("id", id);
      expect(restored.error).toBeNull();
    }
  });
});
