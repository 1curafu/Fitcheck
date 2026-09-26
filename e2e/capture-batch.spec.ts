import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, disposableSessionCookies, reseed, testUserId } from "./helpers";

const garment = readFileSync("e2e/fixtures/garment.jpg");

function photos(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    // Two names deliberately collide. Batch identity must come from selection order.
    name: index < 2 ? "same-name.jpg" : `piece-${index}.jpg`,
    mimeType: "image/jpeg",
    buffer: garment,
  }));
}

async function selectPhotos(page: Page, count: number) {
  await page.locator('input[type="file"][multiple]').setInputFiles(photos(count));
  await expect(page.getByRole("button", { name: "Add to closet" })).toBeVisible({ timeout: 120_000 });
}

/** Delete only folders created during this test, after removing their item rows. */
async function cleanupNewCapture(userId: string, beforeIds: Set<string>, beforeFolders: Set<string>) {
  const db = admin();
  const bucket = db.storage.from("wardrobe");
  const { data: rows, error: rowError } = await db.from("items")
    .select("id, image_url, cutout_url, thumb_url").eq("user_id", userId);
  if (rowError) throw rowError;
  const newRows = (rows ?? []).filter((row) => !beforeIds.has(row.id));
  if (newRows.length) {
    const { error } = await db.from("items").delete().eq("user_id", userId)
      .in("id", newRows.map((row) => row.id));
    if (error) throw error;
  }

  // Include skipped/prepared drafts, which have no item row. Baseline folders
  // are never touched, even if another test left one behind.
  const { data: folders, error: folderError } = await bucket.list(userId, { limit: 1000 });
  if (folderError) throw folderError;
  const created = (folders ?? []).filter((folder) => !beforeFolders.has(folder.name));
  const { data: remaining, error: remainingError } = await db.from("items")
    .select("image_url, cutout_url, thumb_url").eq("user_id", userId);
  if (remainingError) throw remainingError;
  for (const folder of created) {
    const prefix = `${userId}/${folder.name}/`;
    if ((remaining ?? []).some((row) => [row.image_url, row.cutout_url, row.thumb_url]
      .some((path) => path?.startsWith(prefix)))) {
      throw new Error(`Refusing to remove a referenced capture folder: ${prefix}`);
    }
    const { data: objects, error: listError } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    if (listError) throw listError;
    const paths = (objects ?? []).map((object) => `${prefix}${object.name}`);
    if (paths.length) {
      const { error } = await bucket.remove(paths);
      if (error) throw error;
    }
  }
}

async function snapshot(userId: string) {
  const db = admin();
  const { data: rows, error: rowError } = await db.from("items").select("id").eq("user_id", userId);
  if (rowError) throw rowError;
  const { data: folders, error: folderError } = await db.storage.from("wardrobe")
    .list(userId, { limit: 1000 });
  if (folderError) throw folderError;
  return {
    ids: new Set((rows ?? []).map((row) => row.id)),
    folders: new Set((folders ?? []).map((folder) => folder.name)),
  };
}

test.describe("batch capture", () => {
  test.use({ storageState: "e2e/.auth/state.json" });

  test("reviews two photos in order, skips one, and saves exactly two owned items", async ({ page }) => {
    test.setTimeout(360_000);
    const userId = await testUserId();
    const before = await snapshot(userId);
    const workerUrls: string[] = [];
    const fetched: string[] = [];
    page.on("worker", (worker) => workerUrls.push(worker.url()));
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/ort/") || path.startsWith("/models/")) fetched.push(path);
    });
    try {
      await page.goto("/closet/upload");
      await selectPhotos(page, 3);
      await expect(page.getByText("Photo 1 of 3")).toBeVisible();
      await expect(page.locator("[data-filled=true] img")).toHaveCount(0);
      await page.getByPlaceholder("Name", { exact: true }).fill("Batch first shirt");
      await page.getByRole("button", { name: "Add to closet" }).click();
      await expect(page.locator("[data-filled=true] img")).toHaveCount(1);

      await expect(page.getByText("Photo 2 of 3")).toBeVisible({ timeout: 120_000 });
      await expect(page.getByRole("button", { name: "Add to closet" })).toBeVisible({ timeout: 120_000 });
      await page.getByPlaceholder("Name", { exact: true }).fill("Batch second shirt");
      await page.getByRole("button", { name: "Formality 4" }).click();
      await page.getByRole("button", { name: "Add to closet" }).click();
      await expect(page.locator("[data-filled=true] img")).toHaveCount(2);

      await expect(page.getByText("Photo 3 of 3")).toBeVisible({ timeout: 120_000 });
      await expect(page.getByRole("button", { name: "Skip photo" })).toBeVisible({ timeout: 120_000 });
      await page.getByRole("button", { name: "Skip photo" }).click();
      await expect(page.locator("[data-filled=true] img")).toHaveCount(2);
      await expect(page.getByRole("region", { name: "Batch summary" })).toContainText(
        "2 saved · 1 skipped · 0 unprocessed",
      );

      const { data: rows, error } = await admin().from("items")
        .select("id, name, formality, image_url, cutout_url, thumb_url")
        .eq("user_id", userId);
      if (error) throw error;
      const added = (rows ?? []).filter((row) => !before.ids.has(row.id));
      expect(added).toHaveLength(2);
      expect(new Set(added.map((row) => row.id)).size).toBe(2);
      expect(added.map((row) => row.name).sort()).toEqual(["Batch first shirt", "Batch second shirt"]);
      expect(added.find((row) => row.name === "Batch second shirt")?.formality).toBe(4);
      for (const row of added) {
        expect(row.image_url).toBe(`${userId}/${row.id}/original.jpg`);
        expect(row.cutout_url).toMatch(new RegExp(`^${userId}/${row.id}/cutout\\.(webp|png)$`));
        expect(row.thumb_url).toMatch(new RegExp(`^${userId}/${row.id}/thumb\\.(webp|png)$`));
      }
      expect(fetched).toContain("/models/u2netp.onnx");
      expect(fetched.some((path) => path.endsWith(".wasm"))).toBe(true);
      expect(workerUrls.some((url) => url.startsWith(new URL(page.url()).origin))).toBe(true);
      await page.getByRole("button", { name: "Enter closet" }).click();
      await expect(page).toHaveURL(/\/closet$/);
    } finally {
      await cleanupNewCapture(userId, before.ids, before.folders);
      await reseed();
    }
  });

  test("leaving an active batch does not restore an old draft", async ({ page }) => {
    test.setTimeout(240_000);
    const userId = await testUserId();
    const before = await snapshot(userId);
    try {
      await page.goto("/closet/upload");
      await page.locator('input[type="file"][multiple]').setInputFiles(photos(10));
      await expect(page.getByRole("region", { name: "Batch progress" })).toBeVisible();
      await page.goto("/closet");
      await page.goto("/closet/upload");
      await expect(page.getByRole("button", { name: "Capture an item" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Batch progress" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Add to closet" })).toHaveCount(0);
    } finally {
      await cleanupNewCapture(userId, before.ids, before.folders);
      await reseed();
    }
  });
});

test("onboarding fills two of five slots from one selection", async ({ page, context }) => {
  test.setTimeout(300_000);
  const db = admin();
  const email = `batch-${randomUUID()}@fitcheck.test`;
  const password = `batch-${randomUUID()}`;
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw error ?? new Error("Disposable user was not created");
  const userId = created.user.id;
  const before = await snapshot(userId);
  try {
    await context.addCookies(await disposableSessionCookies(email, password));
    await page.goto("/onboarding/capture");
    await selectPhotos(page, 2);
    await page.getByPlaceholder("Name", { exact: true }).fill("Onboarding first");
    await page.getByRole("button", { name: "Add to closet" }).click();
    await expect(page.locator("[data-filled=true]")).toHaveCount(1);
    await expect(page.locator("[data-filled=true] img")).toHaveCount(1);
    await expect(page.getByText("Photo 2 of 2")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole("button", { name: "Add to closet" })).toBeVisible({ timeout: 120_000 });
    await page.getByPlaceholder("Name", { exact: true }).fill("Onboarding second");
    await page.getByRole("button", { name: "Add to closet" }).click();
    await expect(page.locator("[data-filled=true]")).toHaveCount(2);
    await expect(page.locator("[data-filled=true] img")).toHaveCount(2);
    await expect(page.getByRole("region", { name: "Batch summary" })).toContainText(
      "2 saved · 0 skipped · 0 unprocessed",
    );
    const { data: rows, error: readError } = await db.from("items")
      .select("id, name").eq("user_id", userId);
    if (readError) throw readError;
    expect(rows?.map((row) => row.name).sort()).toEqual(["Onboarding first", "Onboarding second"]);
    await page.reload();
    await expect(page.locator("[data-filled=true] img")).toHaveCount(2);
    await expect.poll(() => page.locator("[data-filled=true] img")
      .evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
    await page.getByRole("button", { name: "Enter your closet" }).click();
    await expect(page).toHaveURL(/\/closet$/);
  } finally {
    await cleanupNewCapture(userId, before.ids, before.folders);
    const { error: deleteError } = await db.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  }
});
