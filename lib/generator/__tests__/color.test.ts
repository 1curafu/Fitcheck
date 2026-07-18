import { isNeutral, colorHarmonyScore } from "../color";

test("classifies neutrals vs accents", () => {
  expect(isNeutral("navy")).toBe(true);
  expect(isNeutral("Cream")).toBe(true); // case-insensitive
  expect(isNeutral("rust")).toBe(false);
});
test("an all-neutral outfit scores higher than a multi-accent one", () => {
  expect(colorHarmonyScore(["navy", "cream", "brown"])).toBeGreaterThan(
    colorHarmonyScore(["rust", "olive", "camel"]),
  );
});
test("a single accent on neutrals is fine (>= 0.8)", () => {
  expect(colorHarmonyScore(["navy", "cream", "rust"])).toBeGreaterThanOrEqual(0.8);
});
test("score is clamped to 0..1", () => {
  const s = colorHarmonyScore(["rust", "olive", "camel", "navy"]);
  expect(s).toBeGreaterThanOrEqual(0);
  expect(s).toBeLessThanOrEqual(1);
});
