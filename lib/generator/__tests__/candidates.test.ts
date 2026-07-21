import { buildCandidates, eligibility, missingCategory } from "../candidates";

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

test("cold with NO outerwear still produces outfits — a missing coat is advice, not a blocker", () => {
  const noCoat = items.filter((i) => i.category !== "Outerwear");
  const c = buildCandidates(noCoat, { ...base, weather: { tempC: 5, rain: false } });
  expect(c.length).toBeGreaterThan(0);
  expect(c.every((combo) => !combo.some((i) => i.category === "Outerwear"))).toBe(true);
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

// --- footwear stretches upward (a clean sneaker is valid smart-casual work wear) ---

/** A sneakers-only closet: the shape that produced zero Work/Evening outfits. */
const sneakerCloset = [
  { id: "t1", category: "Tops", colors: ["blue"], formality: 3, seasons: ["Summer"], material: "cotton" },
  { id: "b1", category: "Bottoms", colors: ["charcoal"], formality: 3, seasons: ["Summer"], material: "lyocell" },
  { id: "s1", category: "Shoes", colors: ["white"], formality: 2, seasons: ["Summer"], material: "leather" },
];
const summer = { ...base, season: "Summer", weather: { tempC: 24, rain: false } };

test("f=2 sneakers reach WORK — footwear gets a wider upward tolerance than other categories", () => {
  const cands = buildCandidates(sneakerCloset, { ...summer, band: [3, 4.5] });
  expect(cands.length).toBeGreaterThan(0);
  expect(cands.flat().some((i) => i.id === "s1")).toBe(true);
});

test("f=2 sneakers do NOT reach EVENING — the stretch is one step, not unlimited", () => {
  expect(buildCandidates(sneakerCloset, { ...summer, band: [3.5, 5] })).toHaveLength(0);
});

test("the wider tolerance is footwear-only — an f=2 top still can't reach Evening", () => {
  const casualTop = [
    { id: "t9", category: "Tops", colors: ["grey"], formality: 2, seasons: ["Summer"], material: "cotton" },
    { id: "b1", category: "Bottoms", colors: ["charcoal"], formality: 4, seasons: ["Summer"], material: "wool" },
    { id: "s9", category: "Shoes", colors: ["black"], formality: 4, seasons: ["Summer"], material: "leather" },
  ];
  expect(buildCandidates(casualTop, { ...summer, band: [3.5, 5] })).toHaveLength(0);
});

test("a formality-1 shoe still cannot reach Work — the stretch is bounded", () => {
  const flipFlops = [
    ...sneakerCloset.filter((i) => i.category !== "Shoes"),
    { id: "s0", category: "Shoes", colors: ["black"], formality: 1, seasons: ["Summer"], material: "rubber" },
  ];
  expect(buildCandidates(flipFlops, { ...summer, band: [3, 4.5] })).toHaveLength(0);
});

// --- diagnosing an empty result -------------------------------------------------

test("eligibility reports per-category counts so an empty result can explain itself", () => {
  const e = eligibility(sneakerCloset, { ...summer, band: [3.5, 5] });
  expect(e.Tops).toBe(1);
  expect(e.Bottoms).toBe(1);
  expect(e.Shoes).toBe(0); // the actual blocker
});

test("missingCategory names the required slot that came up empty", () => {
  expect(missingCategory(sneakerCloset, { ...summer, band: [3.5, 5] })).toBe("Shoes");
  expect(missingCategory(sneakerCloset, { ...summer, band: [1.5, 3] })).toBeNull();
});

test("missingCategory ignores outerwear — it never blocks, so it is never the reason", () => {
  expect(
    missingCategory(sneakerCloset, { ...summer, band: [1.5, 3], weather: { tempC: 5, rain: false } }),
  ).toBeNull();
});
