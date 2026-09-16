import { rotateRGBA, rotatedSize } from "../rotate";

// 2×1 image: red pixel left, blue pixel right.
const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
const src = new Uint8ClampedArray([...px(255, 0, 0), ...px(0, 0, 255)]);

test("0 is identity", () => {
  const out = rotateRGBA(src, 2, 1, 0);
  expect([out.width, out.height]).toEqual([2, 1]);
  expect(Array.from(out.data)).toEqual(Array.from(src));
});

test("90 clockwise puts the left pixel on top", () => {
  const out = rotateRGBA(src, 2, 1, 90);
  expect([out.width, out.height]).toEqual([1, 2]);
  expect(Array.from(out.data)).toEqual([...px(255, 0, 0), ...px(0, 0, 255)]);
});

test("180 mirrors both axes", () => {
  const out = rotateRGBA(src, 2, 1, 180);
  expect([out.width, out.height]).toEqual([2, 1]);
  expect(Array.from(out.data)).toEqual([...px(0, 0, 255), ...px(255, 0, 0)]);
});

test("270 clockwise puts the right pixel on top", () => {
  const out = rotateRGBA(src, 2, 1, 270);
  expect([out.width, out.height]).toEqual([1, 2]);
  expect(Array.from(out.data)).toEqual([...px(0, 0, 255), ...px(255, 0, 0)]);
});

test("a 2×2 image rotated four times comes back", () => {
  const sq = new Uint8ClampedArray([...px(1, 0, 0), ...px(2, 0, 0), ...px(3, 0, 0), ...px(4, 0, 0)]);
  let cur = { data: sq, width: 2, height: 2 };
  for (let i = 0; i < 4; i++) cur = rotateRGBA(cur.data, cur.width, cur.height, 90);
  expect(Array.from(cur.data)).toEqual(Array.from(sq));
  const once = rotateRGBA(sq, 2, 2, 90);
  // top-left ← bottom-left, top-right ← top-left
  expect([once.data[0], once.data[4], once.data[8], once.data[12]]).toEqual([3, 1, 4, 2]);
});

test("alpha survives", () => {
  const t = new Uint8ClampedArray([...px(1, 2, 3, 0), ...px(4, 5, 6, 128)]);
  expect(Array.from(rotateRGBA(t, 2, 1, 90).data)).toEqual([...px(1, 2, 3, 0), ...px(4, 5, 6, 128)]);
});

test("rotatedSize swaps on quarter turns only", () => {
  expect(rotatedSize(640, 800, 90)).toEqual({ width: 800, height: 640 });
  expect(rotatedSize(640, 800, 180)).toEqual({ width: 640, height: 800 });
});
