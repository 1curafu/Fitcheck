import { test, expect } from "@playwright/test";
import { admin, reseed, setTier, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

test("saved daily look survives regeneration and can be worn again", async ({ page }) => {
  test.setTimeout(90_000);
  const db = admin();
  const lat = 0.91, lon = 0.93;
  try {
    await reseed();
    const userId = await testUserId();
    const now = new Date();
    const weather = await db.from("weather_cache").upsert([0, 1].map(offset => ({
      lat, lon, day: new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10),
      fetched_at: now.toISOString(), payload: { timezone: "Europe/Zurich", timezoneOffset: 7200,
        daily: { dt: now.getTime() / 1000 + offset * 86400, max: 20, min: 12, conditionId: 800 },
        hourly: [{ dt: now.getTime() / 1000 + offset * 86400, temp: 20, feelsLike: 20, conditionId: 800 }] },
    })), { onConflict: "lat,lon,day" });
    expect(weather.error).toBeNull();
    expect((await db.from("profiles").update({ location_lat: lat, location_lon: lon }).eq("id", userId)).error).toBeNull();
    await page.goto("/generate?occasion=everyday");
    const open = page.getByRole("link", { name: /see the full look/i });
    await expect(open).toBeVisible({ timeout: 30_000 });
    const href = (await open.getAttribute("href"))!;
    const id = href.split("/").at(-1)!;
    await open.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeEnabled();
    await expect.poll(async () => typeof (await db.from("outfits").select("saved_at").eq("id", id).single()).data?.saved_at).toBe("string");
    const before = await db.from("outfits").select("saved_at, look_name, layout, occasion, generated_on, outfit_items(item_id,slot)").eq("id", id).single();
    expect(before.error).toBeNull();
    expect(before.data!.saved_at).not.toBeNull();
    expect(before.data!.occasion).toBe("everyday");
    await page.goto("/generate?occasion=everyday");
    await expect(open).toHaveAttribute("href", href, { timeout: 30_000 });
    await page.getByRole("button", { name: /regenerate/i }).click();
    await expect(open).toBeVisible({ timeout: 30_000 });
    await expect(open).not.toHaveAttribute("href", href, { timeout: 30_000 });
    await expect.poll(async () => typeof (await db.from("outfits").select("released_at").eq("id", id).single()).data?.released_at).toBe("string");
    const retained = await db.from("outfits").select("saved_at, look_name, layout, occasion, generated_on, outfit_items(item_id,slot),released_at,look_index").eq("id", id).single();
    expect(retained.error).toBeNull();
    expect(retained.data).toMatchObject(before.data!);
    expect(retained.data!.released_at).not.toBeNull();
    expect(retained.data!.look_index).toBeNull();
    await page.goto("/outfits");
    await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    await page.locator(`a[href="${href}"]`).click();
    await page.getByRole("button", { name: /wear this today/i }).click();
    await expect(page.getByRole("button", { name: "Worn today", exact: true })).toBeEnabled();
    await expect.poll(async () => (await db.from("wear_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("outfit_id", id)).count).toBe(1);
    const wear = await db.from("wear_logs").select("id").eq("user_id", userId).eq("outfit_id", id);
    expect(wear.error).toBeNull();
    expect(wear.data).toHaveLength(1);
    await page.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await expect.poll(async () => (await db.from("outfits").select("saved_at").eq("id", id).single()).data?.saved_at).toBeNull();
    await page.goto("/outfits");
    await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
    await expect(page.getByText("Save a look you like and it stays here.")).toBeVisible();
  } finally {
    await db.from("weather_cache").delete().eq("lat", lat).eq("lon", lon);
    await reseed();
  }
});

test("Free's eleventh save offers an upgrade without losing the first ten", async ({ page }) => {
  try {
    await reseed();
    const db = admin();
    const userId = await testUserId();
    const inserted = await db.from("outfits").insert(Array.from({ length: 10 }, (_, i) => ({
      user_id: userId, look_name: `Kept look ${i}`, text_locale: "en-US", saved_at: "2026-10-02T12:00:00Z",
    })));
    expect(inserted.error).toBeNull();
    await setTier("free");
    const unsaved = await db.from("outfits").select("id").eq("user_id", userId).is("saved_at", null).single();
    expect(unsaved.error).toBeNull();
    await page.goto(`/outfits/${unsaved.data!.id}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Save this look", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.goto("/outfits");
    await expect(page.getByText("10 of 10 saved")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Pro" })).toBeVisible();
    expect((await db.from("outfits").select("id", { count: "exact", head: true }).eq("user_id", userId).not("saved_at", "is", null)).count).toBe(10);
  } finally { await reseed(); }
});

test("equal timestamps retain every look across Show more", async ({ page }) => {
  try {
    await reseed();
    const db = admin();
    const userId = await testUserId();
    const inserted = await db.from("outfits").insert(Array.from({ length: 31 }, (_, i) => ({
      user_id: userId, look_name: `Page look ${i}`, text_locale: "en-US", saved_at: "2026-10-02T12:00:00Z",
    }))).select("id");
    expect(inserted.error).toBeNull();
    await page.goto("/outfits");
    const first = await page.locator('a[href^="/outfits/"]').evaluateAll(links => links.map(link => link.getAttribute("href")));
    expect(first).toHaveLength(30);
    await page.getByRole("link", { name: "Show more" }).click();
    const tiles = page.locator('a[href^="/outfits/"]');
    await expect(tiles).toHaveCount(1);
    const second = await tiles.first().getAttribute("href");
    expect(new Set([...first, second]).size).toBe(31);
    expect([...first, second].sort()).toEqual(inserted.data!.map(row => `/outfits/${row.id}`).sort());
  } finally { await reseed(); }
});
