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
  const khaki = [{ category: "top", colors: ["khaki"], formality: 3, style_tags: [] }];
  const rust = [{ category: "top", colors: ["rust"], formality: 3, style_tags: [] }];
  const leaning = { ...ctx, lean: ["olive"] };
  expect(scoreCombo(khaki, leaning)).toBeGreaterThan(scoreCombo(rust, leaning));
});
test("no lean leaves scoring exactly as it was", () => {
  expect(scoreCombo(good, { ...ctx, lean: [] })).toBe(scoreCombo(good, ctx));
});
