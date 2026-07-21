import { layoutForLook, staggerOrder } from "../layout";
const pcs = (cats: string[]) => cats.map((category, i) => ({ itemId: `i${i}`, category }));
// Every independently hand-authored template (pieceCount × hasOuterwear):
const ALL_TEMPLATES = [
  ["Tops", "Bottoms", "Shoes"], // 3, no outerwear (top-anchor)
  ["Tops", "Bottoms", "Shoes", "Accessories"], // 4, no outerwear (top-anchor)
  ["Tops", "Bottoms", "Shoes", "Outerwear"], // 4, outerwear-anchor
  ["Tops", "Bottoms", "Shoes", "Outerwear", "Accessories"], // 5, outerwear-anchor
];
const area = (s: { wPct: number; hPct: number }) => s.wPct * s.hPct;

test("returns a slot per piece for 3/4/5-piece looks", () => {
  for (const cats of ALL_TEMPLATES) expect(layoutForLook(pcs(cats))).toHaveLength(cats.length);
});
test("EVERY template keeps all slots in-bounds (no clip) AND rotation within ±6° (D6)", () => {
  for (const cats of ALL_TEMPLATES) {
    for (const s of layoutForLook(pcs(cats))) {
      expect(s.xPct).toBeGreaterThanOrEqual(0);
      expect(s.yPct).toBeGreaterThanOrEqual(0);
      expect(s.xPct + s.wPct).toBeLessThanOrEqual(100);
      expect(s.yPct + s.hPct).toBeLessThanOrEqual(100);
      expect(Math.abs(s.rotationDeg)).toBeLessThanOrEqual(6);
    }
  }
});
test("anchor (outerwear else top) has the highest z AND is first in stagger order", () => {
  const withOuter = layoutForLook(pcs(["Tops", "Bottoms", "Shoes", "Outerwear"]));
  expect(Math.max(...withOuter.map((s) => s.z))).toBe(withOuter[3].z); // Outerwear = top z
  expect(staggerOrder(withOuter)[0]).toBe(3); // ...and animates first
  const noOuter = layoutForLook(pcs(["Tops", "Bottoms", "Shoes"]));
  expect(Math.max(...noOuter.map((s) => s.z))).toBe(noOuter[0].z); // Tops = top z
  expect(staggerOrder(noOuter)[0]).toBe(0); // ...and animates first
});
test("anchor is the largest slot by area — for BOTH the outerwear and top-anchor templates", () => {
  const withOuter = layoutForLook(pcs(["Tops", "Bottoms", "Shoes", "Outerwear"]));
  for (const s of withOuter) expect(area(withOuter[3])).toBeGreaterThanOrEqual(area(s));
  const noOuter = layoutForLook(pcs(["Tops", "Bottoms", "Shoes"]));
  for (const s of noOuter) expect(area(noOuter[0])).toBeGreaterThanOrEqual(area(s));
});
test("deterministic: same categories in same order → identical slots", () => {
  expect(layoutForLook(pcs(["Tops", "Bottoms", "Shoes"]))).toEqual(
    layoutForLook(pcs(["Tops", "Bottoms", "Shoes"])),
  );
});
