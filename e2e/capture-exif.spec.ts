import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * A phone held sideways writes the pixels sideways and an EXIF orientation tag
 * that says "rotate me". The pipeline decodes the photo twice — once to compress
 * (browser-image-compression follows EXIF) and once for the model
 * (createImageBitmap). If those disagree, the mask is applied rotated: the
 * cutout stays the right shape and the test that only checks coverage passes.
 * So this compares the mask itself against the same photo stored upright.
 */
async function cutoutAlpha(page: Page, fixture: string) {
  await page.goto("/closet/upload");
  await page.locator('input[type="file"]').setInputFiles(fixture);
  const cutout = page.locator(".surface-stage img").first();
  await expect(cutout).toBeVisible({ timeout: 90_000 });
  return cutout.evaluate(async (img: HTMLImageElement) => {
    const bmp = await createImageBitmap(await (await fetch(img.src)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    const alpha: number[] = [];
    for (let i = 3; i < d.length; i += 4) alpha.push(d[i]);
    return { w: bmp.width, h: bmp.height, alpha };
  });
}

test("an EXIF-rotated photo gets the same cutout as the upright one", async ({ context }) => {
  test.setTimeout(240_000);
  // Two pages: routes never unmount (Decision 6), so a second upload on the same
  // page would land on a confirm screen that is still mounted.
  const upright = await cutoutAlpha(await context.newPage(), "e2e/fixtures/garment.jpg");
  const rotated = await cutoutAlpha(await context.newPage(), "e2e/fixtures/garment-exif8.jpg");
  expect([rotated.w, rotated.h]).toEqual([upright.w, upright.h]);
  let inter = 0, union = 0;
  for (let i = 0; i < upright.alpha.length; i++) {
    const a = upright.alpha[i] / 255, b = rotated.alpha[i] / 255;
    inter += Math.min(a, b); union += Math.max(a, b);
  }
  expect(inter / union).toBeGreaterThan(0.95);
});
