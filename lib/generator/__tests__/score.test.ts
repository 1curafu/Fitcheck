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
