import { noNativeShare, seededLookId, cleanupShares, createLink } from "./share-helpers";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { admin, disposableSessionCookies, testUserId } from "./helpers";
import uk from "../messages/uk.json";

test.use({ storageState: "e2e/.auth/state.json" });
const BOT = { "user-agent": "facebookexternalhit/1.1" };

function jpegSize(buf: Buffer): { w: number; h: number } {
  for (let i = 2; i < buf.length; ) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  throw new Error("not a JPEG");
}

test("create a link, open it signed out, then stop sharing", async ({ page, browser, request }) => {
  await noNativeShare(page);
  const stranger = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    await page.goto(`/outfits/${await seededLookId()}`);
    const url = await createLink(page);
    expect(url).toMatch(/\/l\/[A-Za-z0-9_-]{22}$/);

    const visitor = await stranger.newPage();
    await visitor.goto(url);
    await expect(visitor.getByRole("img", { name: /E2E Seeded Look/ })).toBeVisible();
    await expect.poll(() => visitor.getByRole("img", { name: /E2E Seeded Look/ }).evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBe(1080);
    await expect(visitor.getByRole("link", { name: /get your own looks/i })).toBeVisible();
    await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const bot = await request.get(url, { headers: BOT });
    expect(bot.status()).toBe(200);
    expect(await bot.text()).toMatch(/og:image" content="[^"]*\/shares\/[A-Za-z0-9_-]{22}\/og\.jpg/);

    const sheet = page.getByRole("dialog", { name: /share this look/i });
    await sheet.getByRole("button", { name: /stop sharing/i }).click();
    await expect(sheet.getByTestId("share-url")).toHaveCount(0);
    await visitor.goto(url);
    await expect(visitor.getByText("This look is no longer shared.")).toBeVisible();
    expect((await request.get(url, { headers: BOT })).status()).toBe(404);
  } finally {
    await stranger.close();
    await cleanupShares();
  }
});

test("a Ukrainian share freezes its text while an English visitor sees English controls", async ({ page, browser }) => {
  await noNativeShare(page);
  const stranger = await browser.newContext({ locale: "en-US", storageState: { cookies: [], origins: [] } });
  try {
    const outfitId = await seededLookId();
    await page.goto(`/uk/outfits/${outfitId}`);
    await expect(page.getByRole("heading", { name: "Тихий ранок", exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: uk.outfit.share, exact: true }).click();
    const sheet = page.getByRole("dialog", { name: uk.share.title, exact: true });
    await sheet.getByRole("button", { name: uk.share.createLink, exact: true }).click();
    const url = (await sheet.getByTestId("share-url").textContent({ timeout: 30_000 }))!.trim();
    const token = new URL(url).pathname.split("/").at(-1)!;
    const db = admin();
    const snapshot = await db.from("look_shares").select("look_name,reasoning").eq("token", token).single();
    const cache = await db.from("outfit_text_translations").select("name,why").eq("outfit_id", outfitId).eq("target_locale", "uk").single();
    expect(snapshot.error).toBeNull();
    expect(cache.error).toBeNull();
    expect(snapshot.data).toEqual({ look_name: cache.data!.name, reasoning: cache.data!.why });
    const visitor = await stranger.newPage();
    await visitor.goto(url);
    await expect(visitor.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(visitor.getByRole("img", { name: /Тихий ранок/ })).toBeVisible();
    await expect(visitor.getByRole("link", { name: /get your own looks/i })).toBeVisible();
    await visitor.goto(`/uk${new URL(url).pathname}`);
    await expect(visitor.getByRole("img", { name: /Тихий ранок/ })).toBeVisible();
    expect((await db.from("look_shares").select("look_name,reasoning").eq("token", token).single()).data).toEqual(snapshot.data);
  } finally {
    await stranger.close();
    await cleanupShares();
  }
});

test("a link survives its look being deleted, and can be stopped from Settings", async ({ page, request }) => {
  await noNativeShare(page);
  const db = admin();
  const userId = await testUserId();
  // A throwaway look copied from the seeded one, so deleting it leaves the seed intact.
  const seeded = await seededLookId();
  const { data: look } = await db.from("outfits").insert({ user_id: userId, look_name: "E2E Share Reroll", text_locale: "en-US", occasion: "everyday" }).select("id").single();
  const { data: links } = await db.from("outfit_items").select("item_id, slot").eq("outfit_id", seeded);
  await db.from("outfit_items").insert((links ?? []).map((l) => ({ outfit_id: look!.id, item_id: l.item_id, slot: l.slot })));
  try {
    await page.goto(`/outfits/${look!.id}`);
    const url = await createLink(page);
    await db.from("outfits").delete().eq("id", look!.id); // what a reroll does
    expect((await request.get(url, { headers: BOT })).status()).toBe(200);

    await page.goto("/settings");
    const list = page.getByRole("list", { name: /shared links/i });
    await expect(list.getByText("E2E Share Reroll")).toBeVisible();
    await list.getByRole("button", { name: /stop sharing/i }).first().click();
    await expect(list.getByText("E2E Share Reroll")).toHaveCount(0);
    expect((await request.get(url, { headers: BOT })).status()).toBe(404);
  } finally {
    await db.from("outfits").delete().eq("id", look!.id);
    await cleanupShares();
  }
});

test("share image downloads a 1080×1920 story and a 1080×1350 post, and creates nothing public", async ({ page }) => {
  await noNativeShare(page);
  await page.goto(`/outfits/${await seededLookId()}`);
  await page.getByRole("button", { name: "Share" }).click();
  const sheet = page.getByRole("dialog", { name: /share this look/i });
  for (const [format, size] of [["Story", { w: 1080, h: 1920 }], ["Post", { w: 1080, h: 1350 }]] as const) {
    await sheet.getByRole("radio", { name: format }).click();
    await expect(sheet.getByRole("button", { name: /share image/i })).toBeEnabled({ timeout: 20_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), sheet.getByRole("button", { name: /share image/i }).click()]);
    expect(jpegSize(await readFile((await download.path())!))).toEqual(size);
  }
  const { data } = await admin().from("look_shares").select("id").eq("user_id", await testUserId());
  expect(data).toEqual([]);
});

test("deleting an account removes its public share page and images", async ({ browser, request }) => {
  const db = admin();
  const email = `share-delete-${randomUUID()}@fitcheck.test`;
  const password = "disposable-share-deletion-password";
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`create disposable user: ${created.error?.message}`);
  const userId = created.data.user.id;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const paths = [0, 1].map((i) => `${userId}/share-${i}/cutout.png`);
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  let token: string | undefined;
  try {
    for (const path of paths) {
      const { error } = await db.storage.from("wardrobe").upload(path, png, { contentType: "image/png" });
      if (error) throw new Error(`upload disposable cutout: ${error.message}`);
    }
    const items = await db.from("items").insert(paths.map((path, i) => ({
      user_id: userId, name: `Disposable share ${i}`, category: i === 0 ? "Tops" : "Bottoms",
      cutout_url: path, image_url: `${userId}/share-${i}/original.jpg`,
      colors: ["white"], pattern: "solid", formality: 3, seasons: ["Spring"], archived: false,
    }))).select("id, category");
    if (items.error || !items.data || items.data.length !== 2) throw new Error(`seed disposable items: ${items.error?.message}`);
    const outfit = await db.from("outfits").insert({ user_id: userId, look_name: "Disposable Look", text_locale: "en-US", occasion: "everyday" }).select("id").single();
    if (outfit.error || !outfit.data) throw new Error(`seed disposable look: ${outfit.error?.message}`);
    const relations = await db.from("outfit_items").insert(items.data.map((item) => ({
      outfit_id: outfit.data.id, item_id: item.id, slot: item.category,
    })));
    if (relations.error) throw new Error(`seed disposable outfit pieces: ${relations.error.message}`);

    context = await browser.newContext();
    await context.addCookies(await disposableSessionCookies(email, password));
    const page = await context.newPage();
    await noNativeShare(page);
    await page.goto(`/outfits/${outfit.data.id}`);
    const url = await createLink(page);
    token = new URL(url).pathname.split("/").at(-1);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByLabel("Type your email exactly to continue").fill(email);
    await page.getByRole("dialog", { name: "Delete account" }).getByRole("button", { name: "Delete account" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await request.get(url, { headers: BOT })).status()).toBe(404);
    const remaining = await db.storage.from("shares").list(token);
    expect(remaining.error).toBeNull();
    expect(remaining.data).toEqual([]);
  } finally {
    await context?.close();
    if (token) {
      await db.storage.from("shares").remove(["story.jpg", "post.jpg", "og.jpg"].map((f) => `${token}/${f}`));
      await db.from("look_shares").delete().eq("token", token);
    }
    await db.storage.from("wardrobe").remove(paths);
    await db.auth.admin.deleteUser(userId);
  }
});
