import { test, expect, type Page } from "@playwright/test";
import { setCaptureFiles } from "./helpers";

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
  await setCaptureFiles(page, 'input[type="file"]:not([multiple])', fixture);
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
  // Cutouts are cropped to the garment (lib/images/trim.ts), and the rotated photo's mask comes from the
  // compressed image, so the crop can differ by a pixel. A mask applied SIDEWAYS would swap the dimensions
  // (504×590 vs 590×504) and collapse the overlap — both still fail here.
  expect(Math.abs(rotated.w - upright.w)).toBeLessThanOrEqual(2);
  expect(Math.abs(rotated.h - upright.h)).toBeLessThanOrEqual(2);
  const w = Math.min(upright.w, rotated.w), h = Math.min(upright.h, rotated.h);
  let inter = 0, union = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = upright.alpha[y * upright.w + x] / 255, b = rotated.alpha[y * rotated.w + x] / 255;
    inter += Math.min(a, b); union += Math.max(a, b);
  }
  expect(inter / union).toBeGreaterThan(0.95);
});
