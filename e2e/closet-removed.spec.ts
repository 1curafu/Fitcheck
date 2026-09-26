import { test, expect } from "@playwright/test";
import { admin, reseed, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

test("a removed piece is listed under Removed pieces and can be put back", async ({ page }) => {
  // Overcoat: not used by closet.spec's remove journey, and never in the seeded look (Tops/Bottoms/Shoes only).
  const piece = "E2E Overcoat";
  try {
    await page.goto("/closet");
    await page.getByText(piece).first().click();
    await page.getByRole("button", { name: /archive/i }).click();
    await page.getByRole("dialog", { name: /remove this piece/i }).getByRole("button", { name: /remove from closet/i }).click();
    await expect(page).toHaveURL(/\/closet$/);

    const link = page.getByRole("link", { name: /removed pieces \(1\)/i });
    // The only way into the list: a comfortable touch target (PRODUCT.md, ≥ 44px).
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/\/closet\/removed$/);
    await page.getByText(piece).filter({ visible: true }).first().click();
    await expect(page.getByText(/removed from your closet/i)).toBeVisible();
    await page.getByRole("button", { name: /put back/i }).click();
    await expect(page.getByRole("button", { name: /archive/i })).toBeVisible();

    // Going BACK to the list (a route kept mounted by React Activity) must not show the piece that was just put back.
    await page.goBack();
    await expect(page).toHaveURL(/\/closet\/removed$/);
    await expect(page.getByText(/nothing removed/i)).toBeVisible();
    await expect(page.getByText(piece).filter({ visible: true })).toHaveCount(0);

    await page.goto("/closet");
    await expect(page.getByText(piece).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /removed pieces/i })).toHaveCount(0);
  } finally {
    await admin().from("items").update({ archived: false }).eq("user_id", await testUserId()).eq("name", piece);
  }
});

test("erasing the original keeps the cut-out, and past looks stay complete", async ({ page }) => {
  const db = admin();
  const userId = await testUserId();
  // ⚠️ The seed picks the look's pieces from an unordered query, so take a piece that IS in the seeded look rather
  // than naming one.
  const { data: look } = await db.from("outfits").select("id")
    .eq("user_id", userId).eq("look_name", "E2E Seeded Look").single();
  if (!look) throw new Error("seed changed: E2E Seeded Look is missing");
  const { data: link } = await db.from("outfit_items").select("item_id").eq("outfit_id", look.id).limit(1).single();
  if (!link) throw new Error("seed changed: E2E Seeded Look has no pieces");
  const { data: row } = await db.from("items").select("id, name, image_url, cutout_url").eq("id", link.item_id).single();
  if (!row?.image_url || !row.cutout_url) throw new Error("seed changed: the look's piece needs an original and a cut-out");
  const folder = row.image_url.slice(0, row.image_url.lastIndexOf("/"));

  try {
    await page.goto(`/closet/${row.id}`);
    await page.getByRole("button", { name: /archive/i }).click();
    await page.getByRole("button", { name: /remove and erase original photo/i }).click();
    await page.getByRole("dialog", { name: /erase the original photo/i }).getByRole("button", { name: /^erase original$/i }).click();
    await expect(page).toHaveURL(/\/closet$/);

    const { data: files } = await db.storage.from("wardrobe").list(folder);
    const names = (files ?? []).map((f) => f.name);
    expect(names).not.toContain("original.jpg");
    expect(names).toContain(row.cutout_url.slice(row.cutout_url.lastIndexOf("/") + 1));
    const { data: after } = await db.from("items").select("image_url, archived").eq("id", row.id).single();
    expect(after).toEqual({ image_url: null, archived: true });

    // D1, checked WHILE the piece is erased and removed: the past look still contains it and every stage image loads.
    // Scoped to the stage with an exact count. The row thumbnails below are loading="lazy" and would report
    // naturalWidth 0 off-screen, and an unscoped `every` passes vacuously on zero images.
    const { count: lookPieces } = await db.from("outfit_items")
      .select("item_id", { count: "exact", head: true }).eq("outfit_id", look.id);
    await page.goto(`/outfits/${look.id}`);
    await expect(page.getByText(row.name as string).first()).toBeVisible();
    const stage = page.getByTestId("detail-stage").locator("img");
    await expect(stage).toHaveCount(lookPieces ?? 0);
    await expect.poll(() => stage.evaluateAll((imgs) =>
      imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);

    // It is listed under Removed pieces.
    await page.goto("/closet/removed");
    await expect(page.getByText(row.name as string).filter({ visible: true }).first()).toBeVisible();

    // Its page renders from the cut-out, offers only Put back, and Put back works without an original.
    await page.goto(`/closet/${row.id}`);
    await expect(page.getByText(/removed from your closet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /erase original photo/i })).toHaveCount(0);
    await page.getByRole("button", { name: /put back/i }).click();
    await expect(page.getByRole("button", { name: /archive/i })).toBeVisible();
  } finally {
    // reseed() re-creates the rows (image_url set) and re-uploads every seeded object, including original.jpg.
    await reseed();
  }
});
