import { alphaBounds, needsTrim, trimCutout, type Pixels } from "../trim";

/** A w×h RGBA image, transparent except an opaque rectangle. */
function pixels(w: number, h: number, box?: { x: number; y: number; w: number; h: number }, alpha = 255): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  if (box) for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) data[(y * w + x) * 4 + 3] = alpha;
  return { data, width: w, height: h };
}

describe("alphaBounds", () => {
  it("finds the garment and adds a 2% border of the longer side", () => {
    // 100×200 canvas, garment at x 30–69, y 50–149 → 40×100; pad = round(100 * 0.02) = 2
    expect(alphaBounds(pixels(100, 200, { x: 30, y: 50, w: 40, h: 100 }))).toEqual({ x: 28, y: 48, width: 44, height: 104 });
  });

  it("never pads past the canvas edge", () => {
    expect(alphaBounds(pixels(50, 50, { x: 0, y: 0, w: 50, h: 50 }))).toEqual({ x: 0, y: 0, width: 50, height: 50 });
  });

  it("ignores faint matte noise below the alpha floor", () => {
    const img = pixels(100, 100, { x: 40, y: 40, w: 20, h: 20 });
    img.data[(5 * 100 + 5) * 4 + 3] = 20; // a stray, nearly transparent pixel in the corner
    // 20px garment → a 2% border rounds to 0; the stray pixel does not widen the box.
    expect(alphaBounds(img)).toEqual({ x: 40, y: 40, width: 20, height: 20 });
  });

  it("returns null for an empty cutout", () => {
    expect(alphaBounds(pixels(10, 10))).toBeNull();
  });
});

describe("trimCutout", () => {
  const png = new Blob(["cutout"], { type: "image/png" });

  it("crops to the garment", async () => {
    const cropped = new Blob(["cropped"], { type: "image/png" });
    const crop = vi.fn(async () => cropped);
    const out = await trimCutout(png, { read: async () => pixels(100, 200, { x: 30, y: 50, w: 40, h: 100 }), crop });
    expect(out).toBe(cropped);
    expect(crop).toHaveBeenCalledWith(png, { x: 28, y: 48, width: 44, height: 104 });
  });

  it("leaves an already-tight cutout alone", async () => {
    const crop = vi.fn();
    const out = await trimCutout(png, { read: async () => pixels(50, 50, { x: 0, y: 0, w: 50, h: 50 }), crop });
    expect(out).toBe(png);
    expect(crop).not.toHaveBeenCalled();
  });

  it("leaves an empty cutout alone rather than producing nothing", async () => {
    const out = await trimCutout(png, { read: async () => pixels(10, 10), crop: vi.fn() });
    expect(out).toBe(png);
  });

  it("never breaks capture: any failure returns the untrimmed cutout", async () => {
    const out = await trimCutout(png, { read: async () => { throw new Error("no canvas"); }, crop: vi.fn() });
    expect(out).toBe(png);
    const out2 = await trimCutout(png, { read: async () => pixels(100, 200, { x: 30, y: 50, w: 40, h: 100 }), crop: async () => null });
    expect(out2).toBe(png);
  });
});

describe("needsTrim (backfill of stored cutouts)", () => {
  it("returns the crop for a cutout that still carries the photo's margin", () => {
    // 100×200 with a 40×100 garment: widest margin 50px of 200 = 25%
    expect(needsTrim(pixels(100, 200, { x: 30, y: 50, w: 40, h: 100 }))).toEqual({ x: 28, y: 48, width: 44, height: 104 });
  });

  it("skips a cutout already cropped at capture (its 2% border is under the 3% bar), so re-runs are harmless", () => {
    // 104×104 with a 100×100 garment centred: margin 2px of 104 ≈ 1.9%
    expect(needsTrim(pixels(104, 104, { x: 2, y: 2, w: 100, h: 100 }))).toBeNull();
  });

  it("skips an empty cutout", () => {
    expect(needsTrim(pixels(10, 10))).toBeNull();
  });
});
