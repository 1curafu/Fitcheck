import { formalityCoherence, scoreCombo } from "../score";

test("tight formality spread scores higher than a wide one", () => {
  expect(formalityCoherence([3, 3, 4])).toBeGreaterThan(formalityCoherence([1, 5, 3]));
});

const ctx = { aesthetic: ["smart_casual"], band: [2.5, 4] as [number, number] };
const good = [
  { category: "top", colors: ["cream"], formality: 3, style_tags: ["smart_casual"] },
  { category: "bottom", colors: ["navy"], formality: 3, style_tags: ["smart_casual"] },
  { category: "shoes", colors: ["brown"], formality: 4, style_tags: ["smart_casual"] },
];
const clashing = [
  { category: "top", colors: ["rust"], formality: 1, style_tags: [] },
  { category: "bottom", colors: ["olive"], formality: 5, style_tags: [] },
  { category: "shoes", colors: ["camel"], formality: 2, style_tags: [] },
];

test("a coherent neutral smart-casual combo outscores a clashing one", () => {
  expect(scoreCombo(good, ctx)).toBeGreaterThan(scoreCombo(clashing, ctx));
});
test("combo score is 0..1", () => {
  expect(scoreCombo(good, ctx)).toBeLessThanOrEqual(1);
  expect(scoreCombo(clashing, ctx)).toBeGreaterThanOrEqual(0);
});

// --- Refine "Lean into" ----------------------------------------------------
// Colour preference is SCORED, not filtered. Filtering made an unlucky pick a
// silent dead-end; ranking means the wish is honoured when the closet can and
// quietly ignored when it can't — the same soft-preference model as outerwear.

const olive = [
  { category: "top", colors: ["olive"], formality: 3, style_tags: [] },
  { category: "bottom", colors: ["cream"], formality: 3, style_tags: [] },
  { category: "shoes", colors: ["brown"], formality: 3, style_tags: [] },
];
const noOlive = [
  { category: "top", colors: ["navy"], formality: 3, style_tags: [] },
  { category: "bottom", colors: ["cream"], formality: 3, style_tags: [] },
  { category: "shoes", colors: ["brown"], formality: 3, style_tags: [] },
];

test("a combo carrying the requested family outranks one that doesn't", () => {
  const leaning = { ...ctx, lean: ["olive"] };
  expect(scoreCombo(olive, leaning)).toBeGreaterThan(scoreCombo(noOlive, leaning));
});
test("an unmatched lean still scores above zero — it never eliminates a combo", () => {
  expect(scoreCombo(noOlive, { ...ctx, lean: ["olive"] })).toBeGreaterThan(0);
});
test("the lean matches by family, not by literal tag word", () => {
  // `green` is in the olive family without being the word "olive". This used to
  // use "khaki", which the tagger can no longer emit now that TagSchema.colors
  // is a z.enum over the palette.
  const green = [{ category: "top", colors: ["green"], formality: 3, style_tags: [] }];
  const rust = [{ category: "top", colors: ["rust"], formality: 3, style_tags: [] }];
  const leaning = { ...ctx, lean: ["olive"] };
  expect(scoreCombo(green, leaning)).toBeGreaterThan(scoreCombo(rust, leaning));
});
test("no lean leaves scoring exactly as it was", () => {
  expect(scoreCombo(good, { ...ctx, lean: [] })).toBe(scoreCombo(good, ctx));
});

// --- Season ----------------------------------------------------------------
// Season is SCORED, not filtered — the same soft-preference model as outerwear
// and the colour lean. Filtering on it made a narrowly-tagged category a silent
// dead-end: measured on a wearable 10-top/4-bottom/4-shoe closet whose trousers
// simply lacked a Winter tag, the same wardrobe gave 40 combos in summer and 0
// in winter.

const winterReady = [
  { category: "top", colors: ["cream"], formality: 3, style_tags: [], seasons: ["Winter"] },
  { category: "bottom", colors: ["navy"], formality: 3, style_tags: [], seasons: ["Winter"] },
  { category: "shoes", colors: ["brown"], formality: 3, style_tags: [], seasons: ["Winter"] },
];
const summerOnly = [
  { category: "top", colors: ["cream"], formality: 3, style_tags: [], seasons: ["Summer"] },
  { category: "bottom", colors: ["navy"], formality: 3, style_tags: [], seasons: ["Summer"] },
  { category: "shoes", colors: ["brown"], formality: 3, style_tags: [], seasons: ["Summer"] },
];

test("an in-season combo outranks an otherwise identical off-season one", () => {
  const winter = { ...ctx, season: "Winter" };
  expect(scoreCombo(winterReady, winter)).toBeGreaterThan(scoreCombo(summerOnly, winter));
});

test("a fully off-season combo still scores above zero — season never eliminates", () => {
  expect(scoreCombo(summerOnly, { ...ctx, season: "Winter" })).toBeGreaterThan(0);
});

test("a partly in-season combo lands between the two", () => {
  const mixed = [winterReady[0], winterReady[1], summerOnly[2]];
  const winter = { ...ctx, season: "Winter" };
  expect(scoreCombo(mixed, winter)).toBeGreaterThan(scoreCombo(summerOnly, winter));
  expect(scoreCombo(mixed, winter)).toBeLessThan(scoreCombo(winterReady, winter));
});

test("untagged items are not penalised by the season term", () => {
  const untagged = winterReady.map((i) => ({ ...i, seasons: [] }));
  const winter = { ...ctx, season: "Winter" };
  expect(scoreCombo(untagged, winter)).toBe(scoreCombo(winterReady, winter));
});

test("no season in the context leaves scoring exactly as it was", () => {
  expect(scoreCombo(good, { ...ctx, season: undefined })).toBe(scoreCombo(good, ctx));
});

test("season and lean can both apply without pushing the score out of 0..1", () => {
  const both = { ...ctx, season: "Winter", lean: ["olive"] };
  expect(scoreCombo(winterReady, both)).toBeLessThanOrEqual(1);
  expect(scoreCombo(winterReady, both)).toBeGreaterThanOrEqual(0);
});

// --- Pattern ---------------------------------------------------------------
// One patterned piece is a statement; two are an argument. Like every other
// signal here it is a preference — a wardrobe of patterned shirts must still
// be dressable.

const oneP = [
  { category: "top", colors: ["cream"], formality: 3, pattern: "striped" },
  { category: "bottom", colors: ["navy"], formality: 3, pattern: "solid" },
  { category: "shoes", colors: ["brown"], formality: 3, pattern: "solid" },
];
const twoP = [
  { category: "top", colors: ["cream"], formality: 3, pattern: "striped" },
  { category: "bottom", colors: ["navy"], formality: 3, pattern: "check" },
  { category: "shoes", colors: ["brown"], formality: 3, pattern: "solid" },
];

test("one statement piece outranks two competing patterns", () => {
  expect(scoreCombo(oneP, ctx)).toBeGreaterThan(scoreCombo(twoP, ctx));
});

test("two patterns still score above zero — clash is a preference, not a veto", () => {
  expect(scoreCombo(twoP, ctx)).toBeGreaterThan(0);
});

test("all-solid is not penalised for being plain", () => {
  const solid = oneP.map((i) => ({ ...i, pattern: "solid" }));
  expect(scoreCombo(solid, ctx)).toBeGreaterThanOrEqual(scoreCombo(oneP, ctx));
});

test("untagged patterns are neutral", () => {
  const untagged = oneP.map((i) => ({ ...i, pattern: null }));
  expect(scoreCombo(untagged, ctx)).toBeGreaterThan(0);
  expect(scoreCombo(untagged, ctx)).toBe(scoreCombo(oneP.map((i) => ({ ...i, pattern: "solid" })), ctx));
});

test("three patterns are worse than two, and still not zero", () => {
  const threeP = twoP.map((i) => ({ ...i, pattern: "print" }));
  expect(scoreCombo(threeP, ctx)).toBeLessThan(scoreCombo(twoP, ctx));
  expect(scoreCombo(threeP, ctx)).toBeGreaterThan(0);
});

// --- Warmth, and the single climate term ------------------------------------
// Season and warmth answer the SAME question — does this suit the climate? —
// so they share one weight rather than competing for the score. Real
// temperature against real cloth leads; the month tag grounds it.

test("with no tempC in context the warmth term is inert", () => {
  const warm = oneP.map((i) => ({ ...i, texture: "Chunky knit" }));
  const light = oneP.map((i) => ({ ...i, texture: "Fine knit" }));
  expect(scoreCombo(warm, ctx)).toBe(scoreCombo(light, ctx));
});

test("on a cold day the warmer combo wins", () => {
  const warm = oneP.map((i) => ({ ...i, texture: "Chunky knit" }));
  const light = oneP.map((i) => ({ ...i, texture: "Fine knit" }));
  expect(scoreCombo(warm, { ...ctx, tempC: 2 })).toBeGreaterThan(
    scoreCombo(light, { ...ctx, tempC: 2 }),
  );
});

test("on a hot day the lighter combo wins", () => {
  const warm = oneP.map((i) => ({ ...i, texture: "Chunky knit" }));
  const light = oneP.map((i) => ({ ...i, texture: "Fine knit" }));
  expect(scoreCombo(light, { ...ctx, tempC: 32 })).toBeGreaterThan(
    scoreCombo(warm, { ...ctx, tempC: 32 }),
  );
});

test("real cloth at a real temperature outweighs the month tag", () => {
  // The whole point of the merge. A chunky knit tagged Summer is a better
  // answer at 0°C than a fine knit tagged Winter: the tag is a proxy, the
  // fabric and the thermometer are not.
  const winter = { ...ctx, season: "Winter", tempC: 0 };
  const warmButMistagged = oneP.map((i) => ({
    ...i,
    texture: "Chunky knit",
    material: "Wool",
    seasons: ["Summer"],
  }));
  const lightButTagged = oneP.map((i) => ({
    ...i,
    texture: "Fine knit",
    material: "Linen",
    seasons: ["Winter"],
  }));
  expect(scoreCombo(warmButMistagged, winter)).toBeGreaterThan(scoreCombo(lightButTagged, winter));
});

test("the season tag still decides when there is no temperature to read", () => {
  const winter = { ...ctx, season: "Winter" };
  expect(scoreCombo(winterReady, winter)).toBeGreaterThan(scoreCombo(summerOnly, winter));
});

test("the season tag still breaks a tie between equally warm combos", () => {
  // Merged, not replaced: warmth leads but the tag keeps a real vote.
  const cold = { ...ctx, season: "Winter", tempC: 0 };
  const tagged = winterReady.map((i) => ({ ...i, material: "Wool", texture: "Flat" }));
  const untagged = summerOnly.map((i) => ({ ...i, material: "Wool", texture: "Flat" }));
  expect(scoreCombo(tagged, cold)).toBeGreaterThan(scoreCombo(untagged, cold));
});

test("every preference at once still lands inside 0..1", () => {
  const all = { ...ctx, season: "Winter", lean: ["olive"], tempC: -5 };
  const items = winterReady.map((i) => ({ ...i, material: "Wool", texture: "Chunky knit" }));
  expect(scoreCombo(items, all)).toBeLessThanOrEqual(1);
  expect(scoreCombo(items, all)).toBeGreaterThanOrEqual(0);
});

test("the aesthetic base keeps a real share even with every preference active", () => {
  // Weather matters, but Fitcheck styles you — it does not just dress you for
  // the thermometer. Colour, formality and DNA must still be able to decide.
  // Colours, seasons, material and texture are IDENTICAL across the two, so the
  // lean and climate terms score them the same and only formality coherence can
  // separate them. If the base were squeezed to nothing this would tie.
  const all = { ...ctx, season: "Winter", lean: ["olive"], tempC: -5 };
  const cloth = { material: "Wool", texture: "Chunky knit", seasons: ["Winter"] };
  const coherent = [
    { category: "top", colors: ["cream"], formality: 3, ...cloth },
    { category: "bottom", colors: ["navy"], formality: 3, ...cloth },
    { category: "shoes", colors: ["brown"], formality: 3, ...cloth },
  ];
  const clash = [
    { category: "top", colors: ["cream"], formality: 1, ...cloth },
    { category: "bottom", colors: ["navy"], formality: 5, ...cloth },
    { category: "shoes", colors: ["brown"], formality: 2, ...cloth },
  ];
  expect(scoreCombo(coherent, all)).toBeGreaterThan(scoreCombo(clash, all));
});
