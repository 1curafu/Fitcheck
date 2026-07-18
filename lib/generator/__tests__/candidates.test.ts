import { buildCandidates } from "../candidates";

const items = [
  { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["spring"], material: "cotton" },
  { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["spring"], material: "cotton" },
  { id: "s1", category: "Shoes", colors: ["brown"], formality: 4, seasons: ["spring"], material: "leather" },
  { id: "s2", category: "Shoes", colors: ["white"], formality: 2, seasons: ["spring"], material: "suede" },
  { id: "o1", category: "Outerwear", colors: ["navy"], formality: 3, seasons: ["spring"], material: "wool" },
  { id: "a1", category: "Accessories", colors: ["brown"], formality: 3, seasons: ["spring"], material: "leather" },
  { id: "f1", category: "Fragrance", colors: [], formality: null, seasons: [], material: null },
];
const base = {
  band: [2.5, 4] as [number, number],
  weather: { tempC: 18, rain: false },
  season: "spring",
  excludeItemIds: [] as string[],
  mustColors: [] as string[],
  maxAccessories: 1,
};

test("every candidate has exactly one top, one bottom, one shoe (required base)", () => {
  for (const c of buildCandidates(items, base)) {
    const cats = c.map((i) => i.category);
    expect(cats.filter((x) => x === "Tops")).toHaveLength(1);
    expect(cats.filter((x) => x === "Bottoms")).toHaveLength(1);
    expect(cats.filter((x) => x === "Shoes")).toHaveLength(1);
  }
});
test("fragrances are NEVER included in any candidate (D11)", () => {
  expect(buildCandidates(items, base).flat().some((i) => i.category === "Fragrance")).toBe(false);
});
test("adds outerwear when cold (<15°)", () => {
  const c = buildCandidates(items, { ...base, weather: { tempC: 10, rain: false } });
  expect(c.every((combo) => combo.some((i) => i.category === "Outerwear"))).toBe(true);
});
test("rain excludes suede shoes (s2)", () => {
  expect(
    buildCandidates(items, { ...base, weather: { tempC: 16, rain: true } })
      .flat()
      .some((i) => i.id === "s2"),
  ).toBe(false);
});
test("accessories are optional and capped (D12): offered both with and without, never over the cap", () => {
  const cands = buildCandidates(items, base);
  expect(cands.some((c) => c.some((i) => i.category === "Accessories"))).toBe(true);
  expect(cands.some((c) => !c.some((i) => i.category === "Accessories"))).toBe(true);
  for (const c of cands) expect(c.filter((i) => i.category === "Accessories").length).toBeLessThanOrEqual(1);
});
test("a must-include colour filters out candidates lacking it (D9 palette intent)", () => {
  const cands = buildCandidates(items, { ...base, mustColors: ["brown"] });
  expect(cands.length).toBeGreaterThan(0);
  for (const c of cands) expect(c.some((i) => i.colors.includes("brown"))).toBe(true);
});
test("excludes recently-worn items", () => {
  expect(
    buildCandidates(items, { ...base, excludeItemIds: ["t1"] })
      .flat()
      .some((i) => i.id === "t1"),
  ).toBe(false);
});
