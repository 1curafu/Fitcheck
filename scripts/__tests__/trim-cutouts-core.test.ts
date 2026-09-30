import { readFileSync } from "node:fs";
import sharp from "sharp";
import { storeTrimmed, trimStoredCutout, verifyTrimmed } from "../trim-cutouts-core";

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

describe("verifyTrimmed — what the stored object actually is after the upload", () => {
  const before = { width: 400, height: 800 };

  test("a cropped object verifies", async () => {
    const tight = await image(176, 416, { x: 8, y: 8, w: 160, h: 400 }, "webp");
    expect(await verifyTrimmed(async () => tight, "u/i/cutout.webp", before)).toMatchObject({ status: "ok", width: 176, height: 416 });
  });

  test("the OLD padded object still being served is reported as 'unchanged' (a stale CDN read), not as a failed crop", async () => {
    // ⚠️ Found on the first production --apply: the read-back right after an overwrite returned the pre-upload bytes, so the
    // script aborted with "still has its margin" although the upload had landed. The verdict must tell the two apart.
    const padded = await image(400, 800, { x: 120, y: 200, w: 160, h: 400 }, "webp");
    expect(await verifyTrimmed(async () => padded, "u/i/cutout.webp", before)).toMatchObject({ status: "unchanged", width: 400, height: 800 });
  });

  test("an object that changed but is still padded is reported as 'padded'", async () => {
    const stillPadded = await image(300, 600, { x: 90, y: 150, w: 120, h: 300 }, "webp");
    expect(await verifyTrimmed(async () => stillPadded, "u/i/cutout.webp", before)).toMatchObject({ status: "padded", width: 300, height: 600 });
  });

  test("a missing object is 'unreadable'", async () => {
    expect((await verifyTrimmed(async () => null, "u/i/cutout.webp", before)).status).toBe("unreadable");
  });

  test("a read that THROWS (a transient network failure) is 'unreadable', never an exception that aborts the run", async () => {
    // ⚠️ Review finding on #138: a rejected fetch escaped to main().catch, bypassing both the retry loop and every later row.
    const flaky = async (): Promise<Buffer | null> => { throw new Error("ECONNRESET"); };
    expect((await verifyTrimmed(flaky, "u/i/cutout.webp", before)).status).toBe("unreadable");
  });

  test("bytes that are not an image (an error page, a truncated body) are 'unreadable', not a decode exception", async () => {
    const garbage = Buffer.from("<html>502 Bad Gateway</html>");
    expect((await verifyTrimmed(async () => garbage, "u/i/cutout.webp", before)).status).toBe("unreadable");
  });
});

describe("scripts/backfill-trim-cutouts.ts (source guards — the script is a CLI with no unit coverage)", () => {
  const script = readFileSync("scripts/backfill-trim-cutouts.ts", "utf8");

  test("every verification read passes a unique cacheNonce, instead of relying on a new token being a new cache key", () => {
    expect(script).toMatch(/createSignedUrl\(path, \d+, \{ cacheNonce \}\)/);
    expect(script).toMatch(/const cacheNonce = `\$\{Date\.now\(\)\}-\$\{Math\.random\(\)/);
  });

  test("a failure while writing or verifying one row is caught and listed, so it cannot abort the remaining rows", () => {
    expect(script).toMatch(/try \{[\s\S]*storeTrimmed\([\s\S]*verifyTrimmed\([\s\S]*\} catch \(e\) \{[\s\S]*failures\.push\(item\.id\)/);
  });
});
