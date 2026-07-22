import { isNeutral, colorHarmonyScore, inFamily, leanScore } from "../color";

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

// --- Refine "Lean into" palette -------------------------------------------
// The palette offers five FAMILIES, not five literal tag values. Haiku tags
// items with free-form common colour names ("charcoal", "beige", "khaki"), so
// matching the palette id verbatim found nothing — "neutral" and "dark" are
// not colours any item will ever carry.

test("a family matches the tag words Haiku actually emits", () => {
  expect(inFamily("beige", "neutral")).toBe(true);
  expect(inFamily("charcoal", "dark")).toBe(true);
  expect(inFamily("khaki", "olive")).toBe(true);
  expect(inFamily("chocolate", "camel")).toBe(true);
  expect(inFamily("denim", "navy")).toBe(true);
});
test("family matching is case- and whitespace-insensitive", () => {
  expect(inFamily(" Charcoal ", "dark")).toBe(true);
});
test("a colour outside a family does not match it", () => {
  expect(inFamily("rust", "navy")).toBe(false);
  expect(inFamily("magenta", "neutral")).toBe(false);
});

test("leanScore is 1 when every requested family is present", () => {
  expect(leanScore(["cream", "charcoal"], ["neutral", "dark"])).toBe(1);
});
test("leanScore is partial when only some requested families are present", () => {
  expect(leanScore(["cream", "rust"], ["neutral", "dark"])).toBe(0.5);
});
test("leanScore is 0 when no requested family is present", () => {
  expect(leanScore(["rust", "magenta"], ["neutral"])).toBe(0);
});
test("leanScore is 1 when nothing was requested (no lean = no penalty)", () => {
  expect(leanScore(["rust"], [])).toBe(1);
});
