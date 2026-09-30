import { test, expect, devices } from "@playwright/test";
import { admin, testUserId } from "./helpers";
import { noNativeShare, seededLookId, cleanupShares, createLink } from "./share-helpers";
import uk from "../messages/uk.json";
import { CURRENT_RELEASE } from "../lib/release-notes";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("an en-US browser stays on the unprefixed URL", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["iPhone 15"], locale: "en-US" });
    try {
      const page = await ctx.newPage();
      const res = await page.goto("/");
      expect(new URL(page.url()).pathname).toBe("/");
      expect(res?.status()).toBe(200);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://fitcheck.space/opengraph-image");
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", "https://fitcheck.space/opengraph-image");
    } finally { await ctx.close(); }
  });

  test("a Ukrainian browser chooses /uk and switching to English UK sticks", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["iPhone 15"], locale: "uk-UA" });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page).toHaveURL(/\/uk$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "uk");
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://fitcheck.space/opengraph-image");
      await page.getByRole("button", { name: "Українська", exact: true }).first().click();
      await page.getByRole("dialog").getByRole("button", { name: "English (UK)", exact: true }).click();
      await expect(page).toHaveURL(/\/en-gb$/);
      await page.goto("/privacy");
      await expect(page).toHaveURL(/\/en-gb\/privacy$/);
    } finally { await ctx.close(); }
  });

  test("a missing Ukrainian page has a Ukrainian 404", async ({ page }) => {
    const res = await page.goto("/uk/nothing-here");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(uk.notFound.title)).toBeVisible();
  });

  test("installed root launch follows the saved Ukrainian cookie",async({page})=>{
    await page.context().addCookies([{name:"NEXT_LOCALE",value:"uk",url:process.env.E2E_BASE_URL??"http://127.0.0.1:3000",sameSite:"Lax"}]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/uk$/);
    await expect(page.locator("html")).toHaveAttribute("lang","uk");
  });
});

test.describe("signed in", () => {
  test.use({ storageState: "e2e/.auth/state.json" });

  test("Settings switching preserves the page and saves the account language", async ({ page }) => {
    const db = admin(), id = await testUserId();
    const profile = await db.from("profiles").select("preferences").eq("id", id).single();
    const user = await db.auth.admin.getUserById(id);
    try {
      await page.goto("/settings?from=language-test");
      await page.getByRole("button", { name: "English (US)", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Українська", exact: true }).click();
      await expect(page).toHaveURL(/\/uk\/settings\?from=language-test$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "uk");
      const { data, error } = await db.from("profiles").select("preferences").eq("id", id).single();
      expect(error).toBeNull();
      expect(data?.preferences).toMatchObject({ locale: "uk" });
      await page.goto("/closet");
      await expect(page).toHaveURL(/\/uk\/closet$/);
    } finally {
      await db.from("profiles").update({ preferences: profile.data?.preferences ?? {} }).eq("id", id);
      // Supabase merges metadata; null clears the locale if it was absent before the test.
      await db.auth.admin.updateUserById(id, { user_metadata: { ...user.data.user?.user_metadata, locale: user.data.user?.user_metadata.locale ?? null } });
      await page.context().clearCookies({ name: "NEXT_LOCALE" });
    }
  });

  test("acknowledged release stays acknowledged across languages",async({page})=>{
    await page.addInitScript(version=>localStorage.setItem("fitcheck:last-seen-release",version),CURRENT_RELEASE.version);
    for (const locale of ["uk","en-gb"]) {
      await page.goto(`/${locale}/closet`);
      await expect(page.getByRole("heading",{level:1})).toBeVisible();
      await expect(page.getByText(CURRENT_RELEASE.i18n?.[locale==="uk"?"uk":"en-GB"]?.headline??CURRENT_RELEASE.headline,{exact:true})).toHaveCount(0);
      expect(await page.evaluate(()=>localStorage.getItem("fitcheck:last-seen-release"))).toBe(CURRENT_RELEASE.version);
    }
  });

  test("removing a piece from Ukrainian redirects to the Ukrainian closet", async ({ page }) => {
    const piece = "E2E Overcoat";
    try {
      await page.goto("/uk/closet");
      await page.getByText(piece).first().click();
      await page.getByRole("button", { name: uk.item.archive, exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: uk.item.remove.remove, exact: true }).click();
      await expect(page).toHaveURL(/\/uk\/closet$/);
    } finally {
      await admin().from("items").update({ archived: false }).eq("user_id", await testUserId()).eq("name", piece);
    }
  });

  test("a bare shared link follows the visitor's Ukrainian cookie", async ({ page, browser }) => {
    await noNativeShare(page);
    const stranger = await browser.newContext({ ...devices["iPhone 15"], storageState: { cookies: [], origins: [] } });
    try {
      await page.goto(`/outfits/${await seededLookId()}`);
      const url = await createLink(page);
      await stranger.addCookies([{ name: "NEXT_LOCALE", value: "uk", url: new URL(url).origin, sameSite: "Lax" }]);
      const visitor = await stranger.newPage();
      await visitor.goto(url);
      await expect(visitor).toHaveURL(/\/uk\/l\/[A-Za-z0-9_-]{22}$/);
      await expect(visitor.getByRole("img", { name: /E2E Seeded Look/ })).toBeVisible();
      await expect(visitor.getByRole("link", { name: uk.share.getLooks })).toBeVisible();
    } finally {
      const sheet = page.getByRole("dialog", { name: /share this look/i });
      if (await sheet.getByTestId("share-url").count()) await sheet.getByRole("button", { name: /stop sharing/i }).click();
      await stranger.close();
      await cleanupShares();
    }
  });
});
