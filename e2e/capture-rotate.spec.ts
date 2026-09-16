import { test, expect, type Page } from "@playwright/test";
import { admin, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

async function shownSize(page: Page) {
  const img = page.locator(".surface-stage img").first();
  await expect(img).toBeVisible({ timeout: 90_000 });
  return img.evaluate(async (el: HTMLImageElement) => {
    const bmp = await createImageBitmap(await (await fetch(el.src)).blob());
    return { w: bmp.width, h: bmp.height };
  });
}

/**
 * The stub answers rotation 0, so the preview starts as uploaded; one tap must
 * turn it a quarter, and what is STORED must be the turned image — not a CSS
 * transform on the preview that every other reader would miss.
 */
test("Rotate turns the preview a quarter turn and the saved cutout is stored turned", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/closet/upload");
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/garment.jpg");
  const before = await shownSize(page);
  await page.getByRole("button", { name: "Rotate" }).click();
  await expect.poll(async () => (await shownSize(page)).w).toBe(before.h);
  expect(await shownSize(page)).toEqual({ w: before.h, h: before.w });

  await page.getByRole("button", { name: "Add to closet" }).click();
  await expect(page).toHaveURL(/\/closet$/, { timeout: 60_000 });

  const db = admin();
  const uid = await testUserId();
  const { data: rows } = await db
    .from("items")
    .select("id, image_url, cutout_url, thumb_url")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = rows![0];
  const { data: blob, error } = await db.storage.from("wardrobe").download(row.cutout_url);
  expect(error).toBeNull();
  const size = await page.evaluate(async ([b64, type]: string[]) => {
    const bmp = await createImageBitmap(await (await fetch(`data:${type};base64,${b64}`)).blob());
    return { w: bmp.width, h: bmp.height };
  }, [Buffer.from(await blob!.arrayBuffer()).toString("base64"), blob!.type || "image/webp"]);
  expect(size).toEqual({ w: before.h, h: before.w });

  // Mutate, then put it back.
  await db.storage.from("wardrobe").remove([row.image_url, row.cutout_url, row.thumb_url].filter(Boolean));
  await db.from("items").delete().eq("id", row.id);
});
