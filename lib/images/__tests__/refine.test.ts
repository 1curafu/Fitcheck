import { sharpenAlpha, guidedFilter, boxMean, punchBackground } from "../refine";

test("sharpen: values below the low knee go to 0, above the high knee to 1, ramp between", () => {
  const out = sharpenAlpha(new Float32Array([0, 0.2, 0.25, 0.5, 0.75, 0.9, 1]), 0.25, 0.75);
  expect(Array.from(out).map((v) => +v.toFixed(3))).toEqual([0, 0, 0, 0.5, 1, 1, 1]);
});

test("sharpen is monotonic — it never reorders two pixels", () => {
  const out = sharpenAlpha(new Float32Array([0.3, 0.4, 0.6]), 0.25, 0.75);
  expect(out[0]).toBeLessThan(out[1]);
  expect(out[1]).toBeLessThan(out[2]);
});

test("box mean over a constant field is the constant, at every pixel including corners", () => {
  const w = 5, h = 4;
  const out = boxMean(new Float32Array(w * h).fill(0.7), w, h, 1);
  for (const v of out) expect(v).toBeCloseTo(0.7);
});

test("box mean of a single bright pixel spreads it over its window", () => {
  const w = 5, h = 5;
  const p = new Float32Array(w * h); p[12] = 9; // centre
  const out = boxMean(p, w, h, 1);
  expect(out[12]).toBeCloseTo(1); // 9 spread over 3×3
  expect(out[0]).toBeCloseTo(0); // corner window does not reach the centre
});

test("guided filter with a flat guide degrades to a box blur of the mask", () => {
  // No structure in the guide → a ≈ 0 → q ≈ mean(p) over the window.
  const w = 7, h = 7;
  const guide = new Float32Array(w * h).fill(0.5);
  const p = new Float32Array(w * h); p[24] = 1; // centre
  const q = guidedFilter(guide, p, w, h, 1, 0.01);
  expect(q[24]).toBeCloseTo(boxMean(boxMean(p, w, h, 1), w, h, 1)[24], 2);
});

test("guided filter snaps a blurry mask to a sharp edge in the guide", () => {
  // Guide: dark left half, light right half. Mask: a soft ramp across the same edge.
  const w = 20, h = 6;
  const guide = new Float32Array(w * h), p = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    guide[y * w + x] = x < 10 ? 0.1 : 0.9;
    p[y * w + x] = Math.min(1, Math.max(0, (x - 6) / 8)); // ramp from x=6 to x=14
  }
  const q = guidedFilter(guide, p, w, h, 3, 1e-4);
  const row = (x: number) => q[3 * w + x];
  // After refinement the transition is steeper at the guide's edge than the input ramp was.
  expect(row(11) - row(8)).toBeGreaterThan(p[3 * w + 11] - p[3 * w + 8]);
  // And it stays inside 0..1.
  for (const v of q) { expect(v).toBeGreaterThanOrEqual(-1e-6); expect(v).toBeLessThanOrEqual(1 + 1e-6); }
});

test("guided filter pulls a background-coloured region out of the mask when it is within reach", () => {
  // Guide: light background with a dark ring; inside the ring the guide is
  // background-coloured. Mask: the whole disc is foreground (the chain case).
  const w = 31, h = 31, cx = 15, cy = 15;
  const guide = new Float32Array(w * h).fill(0.9), p = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d >= 7 && d <= 9) guide[y * w + x] = 0.1; // the ring
    if (d <= 9) p[y * w + x] = 1; // model says: whole disc
  }
  const q = guidedFilter(guide, p, w, h, 6, 1e-3);
  // Deep inside the ring, within the radius of the ring, alpha drops well below 1.
  expect(q[cy * w + cx + 3]).toBeLessThan(0.8);
  // On the ring itself it stays high.
  expect(q[cy * w + cx + 8]).toBeGreaterThan(0.6);
});

describe("punchBackground", () => {
  // A 40×40 white photo with a black U-shaped garment: two 14-px arms joined
  // by a floor, and a 3-px gap between the arms — white background, open at the
  // top, ~7% of the garment's area, like the gap beside a sweater's sleeve.
  const W = 40, H = 40;
  const photo = new Uint8ClampedArray(W * H * 4).fill(255);
  const alpha = new Float32Array(W * H);
  const garment = (x: number, y: number) => x >= 5 && x < 35 && y >= 5 && y < 35 && !(x >= 18 && x < 21 && y < 25);
  const inGap = (x: number, y: number) => x >= 18 && x < 21 && y >= 5 && y < 25;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (garment(x, y)) { photo[i * 4] = photo[i * 4 + 1] = photo[i * 4 + 2] = 20; alpha[i] = 1; }
    else alpha[i] = 0;
  }
  // The model's mistake: the gap is kept at full alpha.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGap(x, y)) alpha[y * W + x] = 1;

  test("a background-coloured gap connected to the outside is punched out", () => {
    const out = punchBackground(photo, alpha, W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (inGap(x, y)) expect(out[i], `gap ${x},${y}`).toBe(0);
      else expect(out[i], `kept ${x},${y}`).toBe(alpha[i]);
    }
  });

  test("an enclosed background-coloured region is left alone — it may be a print", () => {
    const a = alpha.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGap(x, y)) a[y * W + x] = 0;
    // A white 1×2 patch fully inside the left arm (garment on every side), at full alpha.
    for (const [x, y] of [[10, 15], [10, 16]]) { a[y * W + x] = 1; photo[(y * W + x) * 4] = photo[(y * W + x) * 4 + 1] = photo[(y * W + x) * 4 + 2] = 255; }
    const out = punchBackground(photo, a, W, H);
    for (const [x, y] of [[10, 15], [10, 16]]) expect(out[y * W + x]).toBe(1);
    for (const [x, y] of [[10, 15], [10, 16]]) photo[(y * W + x) * 4] = photo[(y * W + x) * 4 + 1] = photo[(y * W + x) * 4 + 2] = 20;
  });

  test("a garment the colour of its background is not touched at all", () => {
    const white = new Uint8ClampedArray(W * H * 4).fill(255);
    const out = punchBackground(white, alpha, W, H);
    expect(Array.from(out)).toEqual(Array.from(alpha));
  });

  test("a shallow nibble along the outline is not a gap and is left alone", () => {
    // The model kept a 1-px white band along the garment's left edge.
    const a = alpha.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGap(x, y)) a[y * W + x] = 0;
    for (let y = 5; y < 35; y++) a[y * W + 4] = 1;
    const out = punchBackground(photo, a, W, H);
    for (let y = 5; y < 35; y++) expect(out[y * W + 4]).toBe(1);
  });

  test("a one-pixel crack running deep into the garment is a shadow, not a gap", () => {
    const a = alpha.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGap(x, y)) a[y * W + x] = 0;
    const crack = photo.slice();
    for (let y = 5; y < 30; y++) { a[y * W + 27] = 1; crack[(y * W + 27) * 4] = crack[(y * W + 27) * 4 + 1] = crack[(y * W + 27) * 4 + 2] = 255; }
    const out = punchBackground(crack, a, W, H);
    for (let y = 5; y < 30; y++) expect(out[y * W + 27]).toBe(1);
  });

  test("a busy background disables the punch, even where the gap matches its average", () => {
    // Exterior alternates 255 and 215 (average 235, spread 20); the gap IS 235.
    const noisy = photo.slice();
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i - x) / W;
      const v = alpha[i] === 0 ? ((x + y) % 2 ? 255 : 215) : inGap(x, y) ? 235 : 20;
      noisy[i * 4] = noisy[i * 4 + 1] = noisy[i * 4 + 2] = v;
    }
    const out = punchBackground(noisy, alpha, W, H);
    expect(Array.from(out)).toEqual(Array.from(alpha));
  });

  test("a wide but shallow bite at the outline is not a gap", () => {
    // A 5×5 background-coloured block kept at full alpha, sitting on the left edge.
    const a = alpha.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGap(x, y)) a[y * W + x] = 0;
    const bite = photo.slice();
    for (let y = 15; y < 20; y++) for (let x = 5; x < 10; x++) { a[y * W + x] = 1; bite[(y * W + x) * 4] = bite[(y * W + x) * 4 + 1] = bite[(y * W + x) * 4 + 2] = 255; }
    const out = punchBackground(bite, a, W, H, { minDepthFrac: 0.25 });
    for (let y = 15; y < 20; y++) for (let x = 5; x < 10; x++) expect(out[y * W + x]).toBe(1);
  });
});
