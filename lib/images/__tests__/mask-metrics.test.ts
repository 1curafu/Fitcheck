import { alphaCoverage, maskIoU, minMaxNormalise } from "../mask-metrics";

// An RGBA buffer w×h with the given alpha per pixel.
const rgba = (alphas: number[]) => {
  const out = new Uint8ClampedArray(alphas.length * 4);
  alphas.forEach((a, i) => (out[i * 4 + 3] = a));
  return out;
};

test("coverage is the share of pixels that are not transparent", () => {
  expect(alphaCoverage(rgba([255, 0, 0, 0]))).toBe(0.25);
  expect(alphaCoverage(rgba([255, 255, 255, 255]))).toBe(1);
  expect(alphaCoverage(rgba([0, 0]))).toBe(0);
});

test("coverage counts a partially transparent pixel by its alpha, not as a whole pixel", () => {
  // Soft edges are most of what separates a good cutout from a bad one, and a
  // binary count would call a 1px halo and a 1px hard edge the same thing.
  expect(alphaCoverage(rgba([128, 0]))).toBeCloseTo(128 / 255 / 2);
});

test("IoU: identical masks are 1, disjoint masks are 0, half-overlap is 0.5", () => {
  const a = rgba([255, 255, 0, 0]);
  expect(maskIoU(a, a)).toBe(1);
  expect(maskIoU(a, rgba([0, 0, 255, 255]))).toBe(0);
  expect(maskIoU(a, rgba([255, 0, 0, 0]))).toBe(0.5);
});

test("IoU on soft masks is soft: intersection is min, union is max, per pixel", () => {
  const a = rgba([255, 0]);
  const b = rgba([128, 0]);
  expect(maskIoU(a, b)).toBeCloseTo(128 / 255);
});

test("IoU of two empty masks is 1 — nothing disagrees", () => {
  expect(maskIoU(rgba([0, 0]), rgba([0, 0]))).toBe(1);
});

test("IoU refuses masks of different sizes rather than comparing garbage", () => {
  expect(() => maskIoU(rgba([255]), rgba([255, 255]))).toThrow();
});

test("min-max normalise maps a mask's own range onto 0..1", () => {
  expect(Array.from(minMaxNormalise(new Float32Array([2, 4, 6])))).toEqual([0, 0.5, 1]);
});

test("min-max normalise of a flat mask is all zero, not NaN", () => {
  // A model that returns a constant is a bug, but dividing by zero would turn
  // it into a NaN alpha channel, which the browser paints as opaque.
  expect(Array.from(minMaxNormalise(new Float32Array([3, 3])))).toEqual([0, 0]);
});
