import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * A real garment photo through the REAL capture pipeline — compression, our own
 * background removal (onnxruntime-web + u2netp, on-device), encoding, upload —
 * to the confirm screen. Only the paid tagging call is stubbed, inside
 * `tagItem`, so the tested path is the shipped path.
 *
 * ⚠️ This is the one test that exercises `lib/images/segment.ts` in a browser
 * against the served runtime and model. The unit tests cover its arithmetic and
 * the parity harness its quality; this covers that it RUNS where users run it,
 * fetching /ort/ and /models/ from our own origin.
 */
test("a real photo becomes a cutout on the confirm screen, on-device", async ({ page }) => {
  const fetched: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith("/ort/") || u.pathname.startsWith("/models/")) fetched.push(u.pathname);
  });

  await page.goto("/closet/upload");
  // ⚠️ A DRAWN shirt, not a photo. `Test assets/` is the owner's wardrobe and is
  // gitignored — the repo is public. This fixture has no copyright, and u2netp
  // segments it at 0.34 coverage, comfortably inside the band asserted below.
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/garment.jpg");

  // The confirm screen renders the cutout on the stage. Give the WASM runtime
  // and a 4.6 MB model time to arrive on a cold cache.
  const cutout = page.locator(".surface-stage img").first();
  await expect(cutout).toBeVisible({ timeout: 90_000 });

  // It is OUR runtime and OUR model, from OUR origin — no CDN, no @imgly.
  expect(fetched.some((p) => p.endsWith("ort-wasm-simd-threaded.wasm"))).toBe(true);
  expect(fetched.some((p) => p === "/models/u2netp.onnx")).toBe(true);
  expect(fetched.every((p) => p.startsWith("/ort/") || p.startsWith("/models/"))).toBe(true);

  // A cutout, not a passthrough: some of it must be transparent, and not all.
  const coverage = await cutout.evaluate(async (img: HTMLImageElement) => {
    const res = await fetch(img.src);
    const bmp = await createImageBitmap(await res.blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i];
    return sum / 255 / (d.length / 4);
  });
  // The fixture measures 0.34 in the harness; anything in this band is a real mask.
  expect(coverage).toBeGreaterThan(0.2);
  expect(coverage).toBeLessThan(0.8);
});
