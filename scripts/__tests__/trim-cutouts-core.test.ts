import sharp from "sharp";
import { trimStoredCutout } from "../trim-cutouts-core";

/** A w×h transparent image with an opaque box, encoded as the given format. */
async function image(w: number, h: number, box: { x: number; y: number; w: number; h: number }, format: "webp" | "png") {
  const raw = Buffer.alloc(w * h * 4);
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) raw.writeUInt32BE(0x224466ff, (y * w + x) * 4);
  const s = sharp(raw, { raw: { width: w, height: h, channels: 4 } });
  return format === "webp" ? s.webp({ lossless: true }).toBuffer() : s.png().toBuffer();
}

test("a padded webp cutout is cropped, stays webp with alpha, and gets a matching thumbnail", async () => {
  const source = await image(400, 800, { x: 120, y: 200, w: 160, h: 400 }, "webp");
  const out = await trimStoredCutout(source, "u/i/cutout.webp", "u/i/thumb.webp");
  expect(out).not.toBeNull();
  const cut = await sharp(out!.cutout).metadata();
  expect(cut.format).toBe("webp");
  expect(cut.hasAlpha).toBe(true);
  // 160×400 garment + round(400 * 0.02) = 8px border each side
  expect([cut.width, cut.height]).toEqual([176, 416]);
  const thumb = await sharp(out!.thumb!).metadata();
  expect(thumb.format).toBe("webp");
  expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(480);
  expect(thumb.width! / thumb.height!).toBeCloseTo(176 / 416, 1);
});

test("a png cutout stays png; no thumbnail is made when the row has none", async () => {
  const source = await image(300, 300, { x: 100, y: 100, w: 100, h: 100 }, "png");
  const out = await trimStoredCutout(source, "u/i/cutout.png", null);
  expect((await sharp(out!.cutout).metadata()).format).toBe("png");
  expect(out!.thumb).toBeNull();
});

test("an already-cropped cutout is left alone", async () => {
  const source = await image(104, 104, { x: 2, y: 2, w: 100, h: 100 }, "webp");
  expect(await trimStoredCutout(source, "u/i/cutout.webp", "u/i/thumb.webp")).toBeNull();
});
