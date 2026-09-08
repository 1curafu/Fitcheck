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

test("accessories and bags never share a slot", () => {
  // ⚠️ They all used to take one CORNER slot, so a watch, a bracelet and a bag
  // were placed at identical coordinates and stacked. Seen in a real drop.
  const slots = layoutForLook([
    { category: "Tops" }, { category: "Bottoms" }, { category: "Shoes" },
    { category: "Accessories" }, { category: "Accessories" }, { category: "Bags" },
  ]);
  const rails = slots.slice(3).map((s) => `${s.xPct},${s.yPct}`);
  expect(new Set(rails).size).toBe(rails.length);
});

test("the rails sit clear of the middle column", () => {
  const slots = layoutForLook([
    { category: "Tops" }, { category: "Bottoms" }, { category: "Shoes" },
    { category: "Accessories" }, { category: "Bags" },
  ]);
  const garments = slots.slice(0, 3);
  const left = Math.min(...garments.map((s) => s.xPct));
  const right = Math.max(...garments.map((s) => s.xPct + s.wPct));
  for (const rail of slots.slice(3)) {
    const clearOfLeft = rail.xPct + rail.wPct <= left;
    const clearOfRight = rail.xPct >= right;
    expect(clearOfLeft || clearOfRight).toBe(true);
  }
});

test("rails alternate sides, so two accessories do not crowd one edge", () => {
  const slots = layoutForLook([
    { category: "Tops" }, { category: "Bottoms" }, { category: "Shoes" },
    { category: "Accessories" }, { category: "Accessories" },
  ]);
  const [a, b] = slots.slice(3);
  expect(a.xPct < 50).not.toBe(b.xPct < 50);
});

test("more small pieces than rails wraps rather than throwing", () => {
  const many = [
    { category: "Tops" }, { category: "Bottoms" }, { category: "Shoes" },
    ...Array.from({ length: 6 }, () => ({ category: "Accessories" })),
  ];
  expect(() => layoutForLook(many)).not.toThrow();
  expect(layoutForLook(many)).toHaveLength(9);
});

test("a look with no coat does not leave the top-right empty", () => {
  // UPPER was only used when outerwear was present, so a three-piece look left
  // the whole top-right quadrant blank.
  const slots = layoutForLook([{ category: "Tops" }, { category: "Bottoms" }, { category: "Shoes" }]);
  const covers = (x: number, y: number) =>
    slots.some((s) => x >= s.xPct && x <= s.xPct + s.wPct && y >= s.yPct && y <= s.yPct + s.hPct);
  expect(covers(70, 25)).toBe(true); // top-right of the stage
});
