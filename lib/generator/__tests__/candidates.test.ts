import { buildCandidates, eligibility, missingCategory } from "../candidates";

const items = [
  { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
  { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
  { id: "s1", category: "Shoes", colors: ["brown"], formality: 4, seasons: ["spring"], material: "leather", texture: null, pattern: null },
  { id: "s2", category: "Shoes", colors: ["white"], formality: 2, seasons: ["spring"], material: "suede", texture: null, pattern: null },
  { id: "o1", category: "Outerwear", colors: ["navy"], formality: 3, seasons: ["spring"], material: "wool", texture: null, pattern: null },
  { id: "a1", category: "Accessories", colors: ["brown"], formality: 3, seasons: ["spring"], material: "leather", texture: null, pattern: null },
  { id: "f1", category: "Fragrance", colors: [], formality: null, seasons: [], material: null, texture: null, pattern: null },
];
const base = {
  band: [2.5, 4] as [number, number],
  weather: { tempC: 18, rain: false },
  season: "spring",
  excludeItemIds: [] as string[],
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
// Colour is no longer an input to candidate building at all — `CandidateArgs`
// has no colour field, so the compiler now guarantees what a test used to. A
// Refine pick is a PREFERENCE applied by ranking; see score.test.ts, "an
// unmatched lean still scores above zero". Filtering here made an unavailable
// colour a silent dead-end: pick "dark" with no black in the closet and the
// screen went empty with nothing to explain it.
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
  { id: "t1", category: "Tops", colors: ["blue"], formality: 3, seasons: ["Summer"], material: "cotton", texture: null, pattern: null },
  { id: "b1", category: "Bottoms", colors: ["charcoal"], formality: 3, seasons: ["Summer"], material: "lyocell", texture: null, pattern: null },
  { id: "s1", category: "Shoes", colors: ["white"], formality: 2, seasons: ["Summer"], material: "leather", texture: null, pattern: null },
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
    { id: "t9", category: "Tops", colors: ["grey"], formality: 2, seasons: ["Summer"], material: "cotton", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["charcoal"], formality: 4, seasons: ["Summer"], material: "wool", texture: null, pattern: null },
    { id: "s9", category: "Shoes", colors: ["black"], formality: 4, seasons: ["Summer"], material: "leather", texture: null, pattern: null },
  ];
  expect(buildCandidates(casualTop, { ...summer, band: [3.5, 5] })).toHaveLength(0);
});

test("a formality-1 shoe still cannot reach Work — the stretch is bounded", () => {
  const flipFlops = [
    ...sneakerCloset.filter((i) => i.category !== "Shoes"),
    { id: "s0", category: "Shoes", colors: ["black"], formality: 1, seasons: ["Summer"], material: "rubber", texture: null, pattern: null },
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

// --- Season is a preference, not a gate ------------------------------------
// The fixture above is tagged "spring" throughout, so asking for winter used to
// return NOTHING — which is exactly the dead end this guards against. Note the
// Title-case argument: production seasons are Title case, fixtures are lower.

test("a closet with nothing tagged for this season still produces outfits", () => {
  const c = buildCandidates(items, { ...base, season: "Winter" });
  expect(c.length).toBeGreaterThan(0);
});

test("season never empties a required slot, so it can never be the missing category", () => {
  expect(missingCategory(items, { ...base, season: "Winter" })).toBeNull();
  expect(eligibility(items, { ...base, season: "Winter" }).Bottoms).toBeGreaterThan(0);
});

test("in-season pieces are offered before off-season ones, so the cap keeps the good ones", () => {
  const mixed = [
    { id: "t-off", category: "Tops", colors: ["cream"], formality: 3, seasons: ["summer"], material: "linen", texture: null, pattern: null },
    { id: "t-on", category: "Tops", colors: ["cream"], formality: 3, seasons: ["winter"], material: "wool", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["winter"], material: "wool", texture: null, pattern: null },
    { id: "s1", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["winter"], material: "leather", texture: null, pattern: null },
  ];
  const first = buildCandidates(mixed, { ...base, season: "winter", maxAccessories: 0 })[0];
  expect(first.some((i) => i.id === "t-on")).toBe(true);
});

test("rain still excludes suede even when the suede shoe is the in-season one", () => {
  const c = buildCandidates(items, { ...base, weather: { tempC: 16, rain: true } });
  expect(c.flat().some((i) => i.id === "s2")).toBe(false);
});

// --- a weather exclusion may narrow a required slot, never empty it ---------
// Same principle as season above, applied to materials. This also fixes a
// pre-existing dead end: a closet whose only shoes were suede returned zero
// outfits in the rain, with the empty screen blaming "Shoes".

const suedeOnly = [
  { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["Spring"], material: "cotton", texture: null, pattern: null },
  { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Spring"], material: "cotton", texture: null, pattern: null },
  { id: "s1", category: "Shoes", colors: ["tan"], formality: 3, seasons: ["Spring"], material: "suede", texture: null, pattern: null },
];

test("rain with suede-only shoes still dresses you — the exclusion cannot empty a slot", () => {
  const wet = { ...base, season: "Spring", weather: { tempC: 16, rain: true } };
  const c = buildCandidates(suedeOnly, wet);
  expect(c.length).toBeGreaterThan(0);
  expect(c.flat().some((i) => i.id === "s1")).toBe(true);
  expect(missingCategory(suedeOnly, wet)).toBeNull();
});

test("relief applies only when the slot is empty — a dry alternative still wins", () => {
  const withAlternative = [
    ...suedeOnly,
    { id: "s2", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["Spring"], material: "leather", texture: null, pattern: null },
  ];
  const wet = { ...base, season: "Spring", weather: { tempC: 16, rain: true } };
  expect(buildCandidates(withAlternative, wet).flat().some((i) => i.id === "s1")).toBe(false);
});

test("heat with fleece-only bottoms still dresses you", () => {
  const fleeceOnly = [
    { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["Summer"], material: "linen", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "polar fleece", texture: null, pattern: null },
    { id: "s1", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["Summer"], material: "leather", texture: null, pattern: null },
  ];
  const hot = { ...base, season: "Summer", weather: { tempC: 30, rain: false } };
  expect(buildCandidates(fleeceOnly, hot).length).toBeGreaterThan(0);
});

test("materials match by substring, so 'polar fleece' is excluded when there is an alternative", () => {
  const hotCloset = [
    { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["Summer"], material: "linen", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "polar fleece", texture: null, pattern: null },
    { id: "b2", category: "Bottoms", colors: ["stone"], formality: 3, seasons: ["Summer"], material: "cotton", texture: null, pattern: null },
    { id: "s1", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["Summer"], material: "leather", texture: null, pattern: null },
  ];
  const hot = { ...base, season: "Summer", weather: { tempC: 30, rain: false } };
  expect(buildCandidates(hotCloset, hot).flat().some((i) => i.id === "b1")).toBe(false);
});

test("a wool trouser survives real heat — fibre alone never decides", () => {
  // The counterpart to the rules-level guard: weight and weave decide whether
  // wool suits 30°C, and `material` records neither. A summer-weight wool
  // trouser must reach a hot-day outfit; seasonFit demotes it if it is tagged
  // for winter, but nothing here eliminates it.
  const hotCloset = [
    { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["Summer"], material: "linen", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "tropical wool", texture: null, pattern: null },
    { id: "b2", category: "Bottoms", colors: ["stone"], formality: 3, seasons: ["Summer"], material: "cotton", texture: null, pattern: null },
    { id: "s1", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["Summer"], material: "leather", texture: null, pattern: null },
  ];
  const hot = { ...base, season: "Summer", weather: { tempC: 32, rain: false } };
  expect(buildCandidates(hotCloset, hot).flat().some((i) => i.id === "b1")).toBe(true);
});

test("relief does NOT rescue a formality gap — only weather exclusions are relieved", () => {
  // sneakerCloset's f=2 shoe genuinely cannot reach Evening; that is a real
  // wardrobe gap the empty screen should still name.
  expect(missingCategory(sneakerCloset, { ...summer, band: [3.5, 5] })).toBe("Shoes");
});

// ── Rain guard, threaded from the user's settings ────────────────────────────

test("rain guard ON (the default) keeps suede out of a wet day", () => {
  const wet = { ...base, weather: { tempC: 18, rain: true } };
  // s1 leather survives, so material relief does NOT fire and the exclusion stands.
  expect(eligibility(items, wet)["Shoes"]).toBe(1);
  expect(buildCandidates(items, wet).flat().some((i) => i.id === "s2")).toBe(false);
});

test("rain guard OFF lets the user wear their suede in the rain", () => {
  const wet = { ...base, weather: { tempC: 18, rain: true }, rainGuard: false };
  expect(eligibility(items, wet)["Shoes"]).toBe(2);
  expect(buildCandidates(items, wet).flat().some((i) => i.id === "s2")).toBe(true);
});

test("every shoe is reachable even when the closet has a single top", () => {
  // Regression: the shoe index was `(t + d * 2) % shoes.length`. With one top,
  // `t` is always 0, so the index reduced to `2d % shoes.length` — permanently 0
  // whenever that length was 2, making the second pair unreachable and emitting
  // the identical combo twice. PR #14 measured shoe coverage on a 20-top closet,
  // where `t` supplied the variation and hid it.
  const minimal = [
    { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
    { id: "s1", category: "Shoes", colors: ["brown"], formality: 3, seasons: ["spring"], material: "leather", texture: null, pattern: null },
    { id: "s2", category: "Shoes", colors: ["white"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
  ];
  const combos = buildCandidates(minimal, base);
  const reached = new Set(combos.flat().filter((i) => i.category === "Shoes").map((i) => i.id));
  expect(reached).toEqual(new Set(["s1", "s2"]));
});

test("shoe coverage holds across awkward list sizes", () => {
  // The stride must stay coprime with the shoe count, not merely be even.
  for (const shoeCount of [1, 2, 3, 4, 5, 6, 8, 9, 10]) {
    const closet = [
      { id: "t1", category: "Tops", colors: ["cream"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
      { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["spring"], material: "cotton", texture: null, pattern: null },
      ...Array.from({ length: shoeCount }, (_, n) => ({
        id: `s${n}`, category: "Shoes", colors: ["brown"], formality: 3,
        seasons: ["spring"], material: "leather", texture: null, pattern: null,
      })),
    ];
    const reached = new Set(
      buildCandidates(closet, base).flat().filter((i) => i.category === "Shoes").map((i) => i.id),
    );
    expect(reached.size, `shoeCount=${shoeCount}`).toBe(shoeCount);
  }
});

// ── The sweltering-day warmth bar ───────────────────────────────────────────
// Above 28° a garment's computed warmth stops being a preference. Reported
// 2026-08-14: a cotton cable-knit sweater reached a 34.8°C day, because
// `HOT_MATERIALS` only catches insulation by FIBRE and a soft score cannot keep
// anything out when `diversify` fills 20 shortlist slots from 66 combos.

const hotDay = {
  ...base,
  season: "Summer",
  weather: { tempC: 22, rain: false, highC: 34, lowC: 20 },
};

test("a heavy knit is barred on a sweltering day even though its fibre is cotton", () => {
  const closet = [
    { id: "t-knit", category: "Tops", colors: ["black"], formality: 3, seasons: ["Autumn", "Winter"], material: "Cotton", texture: "Cable knit", pattern: "solid" },
    { id: "t-linen", category: "Tops", colors: ["white"], formality: 3, seasons: ["Summer"], material: "Linen", texture: "Flat", pattern: "solid" },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "Lyocell", texture: "Twill", pattern: "solid" },
    { id: "s1", category: "Shoes", colors: ["white"], formality: 3, seasons: ["Summer"], material: "Leather", texture: "Flat", pattern: "solid" },
  ];
  const ids = buildCandidates(closet, hotDay).flat().map((i) => i.id);
  expect(ids).not.toContain("t-knit");
  expect(ids).toContain("t-linen");
});

test("the SAME garment survives when the wearer tags it for Summer", () => {
  // The reason the bar reads `itemWarmth` and not a material list: both of these
  // are Cotton / Cable knit, and only the wearer can tell them apart.
  const summerKnit = [
    { id: "t-knit", category: "Tops", colors: ["navy"], formality: 3, seasons: ["Spring", "Summer"], material: "Cotton", texture: "Cable knit", pattern: "solid" },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "Lyocell", texture: "Twill", pattern: "solid" },
    { id: "s1", category: "Shoes", colors: ["white"], formality: 3, seasons: ["Summer"], material: "Leather", texture: "Flat", pattern: "solid" },
  ];
  expect(buildCandidates(summerKnit, hotDay).flat().map((i) => i.id)).toContain("t-knit");
});

test("the bar can NARROW a required slot but can never empty one", () => {
  // The relief rule, and the reason a hard filter is safe here at all. A closet
  // whose every top is heavy knitwear must still be dressable at 34° — "better
  // a slightly-wrong outfit than an empty screen" is the rule this project has
  // now protected four times.
  const allHeavy = [
    { id: "t1", category: "Tops", colors: ["black"], formality: 3, seasons: ["Winter"], material: "Wool", texture: "Chunky knit", pattern: "solid" },
    { id: "t2", category: "Tops", colors: ["grey"], formality: 3, seasons: ["Winter"], material: "Cashmere", texture: "Cable knit", pattern: "solid" },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "Lyocell", texture: "Twill", pattern: "solid" },
    { id: "s1", category: "Shoes", colors: ["white"], formality: 3, seasons: ["Summer"], material: "Leather", texture: "Flat", pattern: "solid" },
  ];
  const combos = buildCandidates(allHeavy, hotDay);
  expect(combos.length).toBeGreaterThan(0);
  expect(missingCategory(allHeavy, hotDay)).toBeNull();
});

test("a merely warm day leaves the bar off entirely", () => {
  const warmNotHot = { ...base, season: "Summer", weather: { tempC: 22, rain: false, highC: 26 } };
  const closet = [
    { id: "t-knit", category: "Tops", colors: ["black"], formality: 3, seasons: ["Autumn", "Winter"], material: "Cotton", texture: "Cable knit", pattern: "solid" },
    { id: "b1", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "Lyocell", texture: "Twill", pattern: "solid" },
    { id: "s1", category: "Shoes", colors: ["white"], formality: 3, seasons: ["Summer"], material: "Leather", texture: "Flat", pattern: "solid" },
  ];
  expect(buildCandidates(closet, warmNotHot).flat().map((i) => i.id)).toContain("t-knit");
});
