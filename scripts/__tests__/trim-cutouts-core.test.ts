import sharp from "sharp";
import { storeTrimmed, trimStoredCutout } from "../trim-cutouts-core";

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

describe("storeTrimmed — the write order decides whether an interrupted run can be repaired", () => {
  const out = { cutout: Buffer.from("cut"), thumb: Buffer.from("thumb") };
  const paths = { cutout: "u/i/cutout.webp", thumb: "u/i/thumb.webp" };

  test("the thumbnail is written BEFORE the cutout", async () => {
    // ⚠️ Reviewer finding on #129: cutout first, then thumbnail meant a stop in between left a tight cutout with
    // the old padded thumbnail; a rerun sees the tight cutout, returns null, and closet/calendar tiles (which
    // prefer thumb_url) stay mis-scaled forever. Thumbnail first leaves the cutout padded, so a rerun redoes both.
    const order: string[] = [];
    await storeTrimmed(async (path) => { order.push(path); return null; }, paths, out);
    expect(order).toEqual(["u/i/thumb.webp", "u/i/cutout.webp"]);
  });

  test("a failed thumbnail write leaves the cutout untouched, so the row is still detected as padded", async () => {
    const written: string[] = [];
    const upload = async (path: string) => {
      if (path.endsWith("thumb.webp")) return { message: "disk full" };
      written.push(path);
      return null;
    };
    await expect(storeTrimmed(upload, paths, out)).rejects.toThrow(/thumb\.webp.*disk full/);
    expect(written).toEqual([]);
  });

  test("a failed cutout write is reported with its path", async () => {
    const upload = async (path: string) => (path.endsWith("cutout.webp") ? { message: "boom" } : null);
    await expect(storeTrimmed(upload, paths, out)).rejects.toThrow(/cutout\.webp.*boom/);
  });

  test("a row without a thumbnail writes only the cutout, with the content type its extension implies", async () => {
    const calls: [string, string][] = [];
    await storeTrimmed(async (p, _b, type) => { calls.push([p, type]); return null; }, { cutout: "u/i/cutout.png", thumb: null }, { cutout: Buffer.from("c"), thumb: null });
    expect(calls).toEqual([["u/i/cutout.png", "image/png"]]);
  });
});
