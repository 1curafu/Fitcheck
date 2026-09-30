import { randomUUID } from "node:crypto";
import { devices, expect, test } from "@playwright/test";
import { admin, readOwnedOutfit, testUserId } from "./helpers";
import en from "../messages/en-US.json";
import de from "../messages/de.json";
import ru from "../messages/ru.json";
import fr from "../messages/fr.json";
import it_ from "../messages/it.json";
import pt from "../messages/pt.json";
import es from "../messages/es.json";
import nl from "../messages/nl.json";

const MORE = { ru, de, fr, it: it_, pt, es, nl } as const;
const PREVAILS = { ru: "английская версия", de: "englische Fassung", fr: "version anglaise", it: "versione inglese",
  pt: "versão inglesa", es: "versión inglesa", nl: "Engelse versie" } as const;

test.describe("seven more languages, signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const [locale, messages] of Object.entries(MORE) as [keyof typeof MORE, typeof de][]) {
    test(`${locale} landing and privacy render in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByText(messages.home.hero.kicker, { exact: true }).first()).toBeVisible();
      await page.goto(`/${locale}/privacy`);
      await expect(page.getByText(PREVAILS[locale], { exact: false }).first()).toBeVisible();
    });
  }

  for (const [locale, width, height] of [["", 393, 852], ["fr", 393, 852], ["de", 375, 667]] as const) {
    test(`sign-in keeps a clear gap between the tagline and the sign-in buttons (${locale || "en-US"} ${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${locale ? `/${locale}` : ""}/sign-in`);
      const tagline = page.locator("main p.font-serif.italic").first();
      // The language button is now the first button in <main>; find Google by its name.
      const google = page.getByRole("button", { name: (locale ? MORE[locale as keyof typeof MORE] : en).auth.google });
      const [t, g] = [(await tagline.boundingBox())!, (await google.boundingBox())!];
      expect(g.y - (t.y + t.height)).toBeGreaterThanOrEqual(24);
    });
  }

  test("a Swiss German browser lands on /de", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["iPhone 15"], locale: "de-CH" });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page).toHaveURL(/\/de$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "de");
    } finally { await ctx.close(); }
  });
});

test.describe("seven more languages, signed in", () => {
  test.use({ storageState: "e2e/.auth/state.json" });

  test("Settings switching to Deutsch keeps the page, saves the account language and the unit", async ({ page }) => {
    const db = admin(), id = await testUserId();
    const profile = await db.from("profiles").select("preferences").eq("id", id).single();
    const user = await db.auth.admin.getUserById(id);
    const unitBefore = (profile.data?.preferences as { tempUnit?: string } | null)?.tempUnit;
    try {
      await page.goto("/settings?from=p3");
      await page.getByRole("button", { name: "English (US)", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Deutsch", exact: true }).click();
      await expect(page).toHaveURL(/\/de\/settings\?from=p3$/);
      await expect(page.locator("html")).toHaveAttribute("lang", "de");
      await expect(page.getByText(de.settings.title, { exact: true }).first()).toBeVisible();
      const { data } = await db.from("profiles").select("preferences").eq("id", id).single();
      expect(data?.preferences).toMatchObject({ locale: "de" });
      if (unitBefore) expect((data?.preferences as { tempUnit?: string }).tempUnit).toBe(unitBefore);
    } finally {
      await db.from("profiles").update({ preferences: profile.data?.preferences ?? {} }).eq("id", id);
      await db.auth.admin.updateUserById(id, { user_metadata: { ...user.data.user?.user_metadata, locale: user.data.user?.user_metadata.locale ?? null } });
      await page.context().clearCookies({ name: "NEXT_LOCALE" });
    }
  });

  /** The picker is a small dropdown beside its button: on screen, compact, and scrollable for all ten languages. */
  async function expectCompactScrollableMenu(page: import("@playwright/test").Page, trigger: string, centered = false,
    scope?: import("@playwright/test").Locator) {
    // The landing has two buttons with the same name (top bar and footer); a scope picks one.
    const button = (scope ?? page).getByRole("button", { name: trigger, exact: true });
    await button.scrollIntoViewIfNeeded();
    const anchor = (await button.boundingBox())!;
    await button.click();
    const menu = page.getByRole("dialog");
    const box = (await menu.boundingBox())!, height = page.viewportSize()!.height;
    expect(box.height).toBeLessThanOrEqual(300);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    // Anchored to its button, not a full-width sheet from the bottom edge.
    expect(Math.min(Math.abs(box.y - (anchor.y + anchor.height)), Math.abs(box.y + box.height - anchor.y))).toBeLessThanOrEqual(12);
    expect(box.width).toBeLessThan(page.viewportSize()!.width - 40);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (centered) expect(Math.abs(box.x + box.width / 2 - (anchor.x + anchor.width / 2))).toBeLessThanOrEqual(12);
    expect(await menu.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    const last = menu.getByRole("button", { name: "Nederlands", exact: true });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  }

  test("the language dropdown is small, anchored and scrollable on a small iPhone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 548 });
    await page.goto("/settings");
    await expectCompactScrollableMenu(page, "English (US)");
  });

  for (const locale of ["pt", "es", "ru", "de"] as const) {
    test(`${locale} occasion chips stay on one line and all four fit the screen`, async ({ page }) => {
      await page.goto(`/${locale}/generate`);
      const chips = page.locator("button[aria-pressed]").filter({ hasText: MORE[locale].vocab.occasion.weekend });
      await expect(chips.first()).toBeVisible({ timeout: 30_000 });
      const row = page.locator("button[aria-pressed]");
      const boxes = await Promise.all((await row.all()).slice(0, 4).map(chip => chip.boundingBox()));
      const width = page.viewportSize()!.width;
      for (const box of boxes) {
        expect(box!.height).toBeLessThanOrEqual(48);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
    });
  }

  for (const [name, path, scope] of [
    ["the landing footer button opens upward and stays on screen", "/", (p: import("@playwright/test").Page) => p.getByRole("contentinfo")],
    ["the landing top-bar button opens downward and stays inside the right edge", "/", (p: import("@playwright/test").Page) => p.getByRole("banner")],
    ["the sign-in top button opens downward and stays inside the right edge", "/sign-in", undefined],
  ] as const) {
    test(name, async ({ browser }) => {
      const ctx = await browser.newContext({ ...devices["iPhone 15"], storageState: { cookies: [], origins: [] } });
      try {
        const page = await ctx.newPage();
        await page.goto(path);
        await expectCompactScrollableMenu(page, "English (US)", false, scope?.(page));
      } finally { await ctx.close(); }
    });
  }

  test("a historical English look is shown in German and its original stays saved", async ({ page }) => {
    const db = admin(), userId = await testUserId(), id = randomUUID();
    const items = await db.from("items").select("id").eq("user_id", userId).limit(3);
    if (items.error || items.data?.length !== 3) throw new Error("Look fixture pieces missing");
    const added = await db.from("outfits").insert({ id, user_id: userId, look_name: "E2E German Original", ai_reasoning: "Original fixture explanation.",
      text_locale: "en-US", occasion: "work", layout: { anchorIndex: 0, pieces: items.data.map(item => ({ itemId: item.id, slot: "piece" })) } });
    if (added.error) throw new Error("Look fixture insert failed");
    const links = await db.from("outfit_items").insert(items.data.map(item => ({ outfit_id: id, item_id: item.id, slot: "piece" })));
    if (links.error) throw new Error("Look fixture links failed");
    try {
      const before = await readOwnedOutfit(id);
      await page.goto(`/de/outfits/${id}`);
      await expect(page.getByRole("heading", { name: "Ruhiger Morgen", exact: true })).toBeVisible({ timeout: 15_000 });
      expect(await readOwnedOutfit(id)).toEqual(before);
    } finally { await db.from("outfits").delete().eq("id", id); }
  });
});
