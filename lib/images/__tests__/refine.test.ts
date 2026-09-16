import { sharpenAlpha, guidedFilter, boxMean } from "../refine";

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
