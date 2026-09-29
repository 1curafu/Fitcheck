import { randomUUID } from "node:crypto";
import { devices, expect, test } from "@playwright/test";
import { admin, readOwnedOutfit, testUserId } from "./helpers";
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
      await expect(page.getByText(messages.landing.kicker, { exact: true }).first()).toBeVisible();
      await page.goto(`/${locale}/privacy`);
      await expect(page.getByText(PREVAILS[locale], { exact: false }).first()).toBeVisible();
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

  test("the ten-language sheet fits a small iPhone and every language is reachable", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 548 });
    await page.goto("/settings");
    await page.getByRole("button", { name: "English (US)", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading")).toBeInViewport();
    const box = await sheet.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    const last = sheet.getByRole("button", { name: "Nederlands", exact: true });
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await page.keyboard.press("Escape");
  });

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
