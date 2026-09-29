/**
 * Regenerates public/landing/*.webp — the landing's example garments — from the owner's photos in `Test assets/`.
 *
 *   node scripts/landing-assets.mjs
 *
 * Same cutout as capture: the harness page runs the SHIPPED segment() + U2NETP_REFINE in a real browser. Then the
 * cutout is trimmed to its alpha bounds (+2% border) — capture does not trim yet (fix/cutout-trim), and an untrimmed
 * canvas renders the garment small — and encoded as WebP with alpha, at most 640px and 60 KB.
 * Outputs are committed; run this only when the selection changes.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = join(ROOT, "public/landing");
const SOURCES = {
  "navy-sweater": "IMG_8396.jpg",
  "white-trousers": "Screenshot 2026-07-21 at 09.56.41.png",
  "white-sneakers": "IMG_7914.jpg",
  "watch": "Screenshot 2026-09-04 at 05.45.48.png",
  "blue-shirt": "IMG_7913.jpg",
  "stone-trousers": "Screenshot 2026-07-24 at 09.57.56.png",
  "cream-sneakers": "Screenshot 2026-07-21 at 09.58.38.png",
  "cream-knit-polo": "Screenshot 2026-07-24 at 10.11.00.png",
  "light-jeans": "Screenshot 2026-08-18 at 20.48.51.png",
  "pale-blue-sneakers": "Screenshot 2026-08-18 at 08.45.34.png",
};
const ALPHA_FLOOR = 24, PAD = 0.02, MAX_PX = 640, MAX_BYTES = 60_000;

execSync(
  "npx tsc lib/images/segment.ts lib/images/mask-metrics.ts lib/images/refine.ts --module esnext --target es2022 --moduleResolution bundler --skipLibCheck --ignoreConfig --lib es2022,dom --outDir scratch/harness-build",
  { stdio: "inherit" },
);
execSync("node scripts/copy-ort.mjs");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".onnx": "application/octet-stream" };
const server = createServer((req, res) => {
  const path = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(path) || statSync(path).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream",
    "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "require-corp" });
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));

async function trim(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let top = info.height, left = info.width, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > ALPHA_FLOOR) {
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (right < 0) throw new Error("empty cutout");
  const width = right - left + 1, height = bottom - top + 1, pad = Math.round(Math.max(width, height) * PAD);
  return sharp(png).extract({ left, top, width, height })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
}

async function encode(png) {
  for (const quality of [82, 76, 70, 64, 58, 52]) {
    const out = await sharp(png).resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
      .webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  throw new Error("cannot fit the size budget");
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/scripts/cutout-harness/harness.html`);
  await page.waitForFunction(() => window.harnessReady, null, { timeout: 60_000 });
  mkdirSync(OUT, { recursive: true });
  for (const [name, file] of Object.entries(SOURCES)) {
    const src = join(ROOT, "Test assets", file);
    const type = file.endsWith(".png") ? "image/png" : "image/jpeg";
    const { png } = await page.evaluate(([b64, t]) => window.harness.ours(b64, t), [readFileSync(src).toString("base64"), type]);
    const webp = await encode(await trim(Buffer.from(png, "base64")));
    writeFileSync(join(OUT, `${name}.webp`), webp);
    console.log(`${name.padEnd(20)} ${(webp.length / 1024).toFixed(1)} KB`);
  }
} finally {
  await browser.close();
  server.close();
}
