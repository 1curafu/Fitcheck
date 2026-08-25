import { fitWithin, encodeThumb, thumbFilename, drawScaled } from "../thumb";

const blobOf = (bytes: number, type: string) => new Blob([new Uint8Array(bytes)], { type });
const cutout = blobOf(1000, "image/webp");

/**
 * The size math, which is the part that can silently be wrong: a thumbnail that
 * quietly changes a garment's proportions is worse than a heavy one, because
 * nothing about it looks broken.
 */
describe("fitWithin", () => {
  test("caps the LONGEST side, whichever it is", () => {
    expect(fitWithin(1280, 640, 480)).toEqual({ width: 480, height: 240 });
    expect(fitWithin(640, 1280, 480)).toEqual({ width: 240, height: 480 });
  });

  test("preserves the aspect ratio", () => {
    const { width, height } = fitWithin(1000, 1500, 480);
    expect(width / height).toBeCloseTo(1000 / 1500, 5);
  });

  test("never upscales — a small source stays its own size", () => {
    expect(fitWithin(300, 200, 480)).toEqual({ width: 300, height: 200 });
  });

  test("a square stays square", () => {
    expect(fitWithin(900, 900, 480)).toEqual({ width: 480, height: 480 });
  });

  // A 1x1 source (the e2e seed uses one) must not round to a zero-width canvas,
  // which throws in every browser.
  test("never rounds a dimension below 1", () => {
    const { width, height } = fitWithin(1, 1000, 480);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});

/**
 * ⚠️ The alpha guarantee. The cutout floats on a dark canvas; a thumbnail with
 * a white matte behind it would be worse than shipping no thumbnail at all,
 * and it would look fine in every byte count.
 */
describe("drawScaled", () => {
  test("never paints a background — the canvas keeps its transparency", () => {
    const calls: string[] = [];
    const ctx = {
      drawImage: () => calls.push("drawImage"),
      fillRect: () => calls.push("fillRect"),
      set fillStyle(_v: string) {
        calls.push("fillStyle");
      },
    };
    const canvas = { width: 0, height: 0 };
    drawScaled({ width: 1280, height: 640 }, canvas, ctx as never, 480);

    expect(calls).toEqual(["drawImage"]);
    expect(canvas).toEqual({ width: 480, height: 240 });
  });
});

/**
 * ⚠️ **`null` means "no thumbnail", and that is deliberate.** `encodeCutout`
 * falls back to its SOURCE blob, which is right for a cutout — something must
 * be stored either way. It would be wrong here: storing the full-size source as
 * `thumb.webp` doubles the bytes for zero gain, which is precisely what this
 * plan exists to stop. `null` leaves `thumb_url` null instead, so every failure
 * path lands on the legacy path that readers must already support.
 */
describe("encodeThumb", () => {
  test("uses the WebP the encoder produced", async () => {
    const out = await encodeThumb(cutout, 480, async () => blobOf(120, "image/webp"));
    expect(out).toEqual({ blob: expect.any(Blob), mediaType: "image/webp" });
    expect(out!.blob.size).toBe(120);
  });

  // A browser whose WebP encoder fails can still produce a PNG, and a 480px PNG
  // is far smaller than a 1280px cutout — worth keeping rather than discarding.
  test("accepts a PNG derivative when that is what the encoder managed", async () => {
    const out = await encodeThumb(cutout, 480, async () => blobOf(120, "image/png"));
    expect(out).toEqual({ blob: expect.any(Blob), mediaType: "image/png" });
  });

  test("returns null when the encoder returns nothing", async () => {
    expect(await encodeThumb(cutout, 480, async () => null)).toBeNull();
  });

  test("returns null rather than throwing mid-upload", async () => {
    const out = await encodeThumb(cutout, 480, async () => {
      throw new Error("canvas unavailable");
    });
    expect(out).toBeNull();
  });

  /**
   * The whole point. A "thumbnail" that is not materially smaller is pure cost —
   * upload CPU, a storage object and a column — for nothing, so it is not stored.
   */
  test("refuses a derivative that is not materially smaller than its source", async () => {
    expect(await encodeThumb(cutout, 480, async () => blobOf(900, "image/webp"))).toBeNull();
  });

  test("ignores a format that is neither WebP nor PNG", async () => {
    expect(await encodeThumb(cutout, 480, async () => blobOf(100, "image/gif"))).toBeNull();
  });

  test("the stored filename follows the format actually produced", () => {
    expect(thumbFilename("image/webp")).toBe("thumb.webp");
    expect(thumbFilename("image/png")).toBe("thumb.png");
  });
});
