import { test, expect } from "@playwright/test";
import { SHIPPED_LOCALES, localizedPath, type ShippedLocale } from "../lib/i18n/locales";

import enUS from "../messages/en-US.json";
import uk from "../messages/uk.json";
import ru from "../messages/ru.json";
import de from "../messages/de.json";
import fr from "../messages/fr.json";
import it from "../messages/it.json";
import pt from "../messages/pt.json";
import es from "../messages/es.json";
import nl from "../messages/nl.json";

// Playwright runs Node: static JSON imports avoid the app loader’s dynamic import-attribute boundary.
const catalogs = { "en-US": enUS, "en-GB": enUS, uk, ru, de, fr, it, pt, es, nl };
const copyFor = (locale: ShippedLocale) => catalogs[locale];

test.describe("public support", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("login help opens support and accepts a message through local providers", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", request => requests.push(request.url()));
    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Need help?" }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByLabel("Reply email")).toHaveValue("");
    await page.getByLabel("Reply email").fill("reader@example.com");
    await page.getByLabel("Topic").selectOption("technical");
    await page.getByLabel("Message", { exact: true }).fill("The sign-in link did not work on my phone.");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Message sent");
    await expect(page.getByRole("status")).toBeFocused();
    expect(requests.some(url => url.includes("challenges.cloudflare.com"))).toBe(false);
    await page.getByRole("button", { name: "Write another message" }).click();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
  });
  test("native constraints keep an invalid email out of the action", async ({ page }) => {
    await page.goto("/support");
    await page.getByLabel("Reply email").fill("not-an-email");
    await page.getByLabel("Message", { exact: true }).fill("Please help me sign in.");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByLabel("Reply email")).toBeFocused();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Please help me sign in.");
    await expect(page.getByRole("status")).toHaveCount(0);
  });
  test("Activity keeps the draft when navigating away and back", async ({ page }) => {
    await page.goto("/support");
    await page.getByLabel("Reply email").fill("reader@example.com");
    await page.getByLabel("Message", { exact: true }).fill("Keep this draft after navigation.");
    await page.getByRole("link", { name: /Privacy Policy/ }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await page.goBack();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Keep this draft after navigation.");
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled();
  });
  test("Ukrainian sign-in keeps localized support and privacy navigation", async ({ page }) => {
    const messages = copyFor("uk");
    await page.goto("/uk/sign-in");
    await page.getByRole("link", { name: messages.landing.support, exact: true }).click();
    await expect(page).toHaveURL(/\/uk\/support$/);
    await page.getByRole("link", { name: messages.support.privacyHint }).click();
    await expect(page).toHaveURL(/\/uk\/privacy$/);
  });
  for (const locale of SHIPPED_LOCALES) {
    test(`support is labelled, noindex and fits a phone in ${locale}`, async ({ page }) => {
      const t = copyFor(locale).support;
      for (const width of [360, 393]) {
        await page.setViewportSize({ width, height: 852 });
        await page.goto(localizedPath(locale, "/support"));
        await expect(page.getByRole("heading", { name: t.title, level: 1 })).toBeVisible();
        await expect(page.getByLabel(t.replyEmail)).toBeVisible();
        await expect(page.getByLabel(t.topic)).toBeVisible();
        for (const label of Object.values(t.topics)) await expect(page.getByRole("option", { name: label, exact: true })).toHaveCount(1);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
        await expect(page.getByRole("link", { name: t.privacyHint })).toHaveAttribute("href", localizedPath(locale, "/privacy"));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (["en-US", "uk", "de"].includes(locale)) await page.screenshot({ path: `.superpowers/sdd/2026-10-01-support-page/support-${locale}-${width}.png`, fullPage: true });
      }
    });
  }
});
test.describe("signed-in support", () => {
  test.use({ storageState: "e2e/.auth/state.json" });
  test("Settings offers support without automatically attaching account data", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("link", { name: /Support/ }).click();
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByLabel("Reply email")).toHaveValue("");
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("");
    await page.goto("/uk/support");
    const t = (copyFor("uk")).support;
    await expect(page.getByLabel(t.replyEmail)).toHaveValue("");
  });
});

test.describe("public support server validation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("a whitespace-only draft stays editable and focuses the server field error", async ({ page }) => {
    await page.goto("/support");
    await page.getByLabel("Reply email").fill("reader@example.com");
    await page.getByLabel("Message", { exact: true }).fill("          ");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Check the form and try again.");
    await expect(page.getByLabel("Message", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue("          ");
    await expect(page.getByLabel("Message", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled();
    await page.screenshot({ path: ".superpowers/sdd/2026-10-01-support-page/support-field-error.png", fullPage: true });
  });
});
