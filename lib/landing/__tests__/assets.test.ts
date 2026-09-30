import { existsSync, readdirSync, statSync } from "node:fs";
import sharp from "sharp";

const NAMES = ["navy-sweater", "white-trousers", "white-sneakers", "watch", "blue-shirt", "stone-trousers",
  "cream-sneakers", "cream-knit-polo", "light-jeans", "pale-blue-sneakers"];

test("public/landing holds exactly the ten example garments", () => {
  expect(existsSync("public/landing")).toBe(true);
  expect(readdirSync("public/landing").sort()).toEqual(NAMES.map((n) => `${n}.webp`).sort());
});

for (const name of NAMES) {
  test(`${name}.webp is small, has alpha, and is trimmed to the garment`, async () => {
    const path = `public/landing/${name}.webp`;
    expect(statSync(path).size).toBeLessThanOrEqual(60_000);
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(Math.max(info.width, info.height)).toBeLessThanOrEqual(640);
    let top = info.height, left = info.width, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    // An untrimmed cutout keeps the photo's canvas; the median test photo rendered 1.28x too small that way.
    const limit = Math.ceil(Math.max(info.width, info.height) * 0.03) + 1;
    expect(Math.max(top, left, info.width - 1 - right, info.height - 1 - bottom)).toBeLessThanOrEqual(limit);
  });
}
