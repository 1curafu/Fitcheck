import { isNeutral, colorHarmonyScore, inFamily, leanScore, NEUTRAL_NAMES, COLOR_FAMILIES } from "../color";
import { COLORS } from "@/lib/closet/vocab";

test("classifies neutrals vs accents", () => {
  expect(isNeutral("navy")).toBe(true);
  expect(isNeutral("Cream")).toBe(true); // case-insensitive
  expect(isNeutral("rust")).toBe(false);
});
test("an all-neutral outfit scores higher than a multi-accent one", () => {
  // `olive` and `camel` are NEUTRALS now (both foundational menswear), so the
  // old fixture ["rust","olive","camel"] carried a single accent and tied.
  expect(colorHarmonyScore(["navy", "cream", "brown"])).toBeGreaterThan(
    colorHarmonyScore(["rust", "green", "pink"]),
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
  expect(inFamily("olive", "olive")).toBe(true);
  expect(inFamily("brown", "camel")).toBe(true);
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

// ── The three colour vocabularies must be ONE vocabulary ────────────────────

test("every neutral is a real palette colour", () => {
  // NEUTRALS used to carry khaki, ecru and gray — none of which the picker can
  // produce — while omitting camel, brown's closest neighbour and the canonical
  // menswear neutral.
  for (const n of NEUTRAL_NAMES) {
    expect(COLORS.map((c) => c.name)).toContain(n);
  }
});

test("every colour family member is a real palette colour", () => {
  // The families were widened to catch Haiku's free-form output (sand, oatmeal,
  // taupe, cognac, terracotta, cobalt, sage, onyx…). With the schema
  // constrained, a family entry the picker cannot produce is dead weight that
  // silently never matches.
  const palette = COLORS.map((c) => c.name);
  for (const [family, members] of Object.entries(COLOR_FAMILIES)) {
    for (const m of members) {
      expect(palette, `${family} → ${m}`).toContain(m);
    }
  }
});

test("the family ids are exactly the Refine sheet's five swatches", () => {
  expect(Object.keys(COLOR_FAMILIES).sort()).toEqual(
    ["camel", "dark", "navy", "neutral", "olive"].sort(),
  );
});

test("camel counts as a neutral", () => {
  // A camel coat is foundational menswear, not an accent. colorHarmonyScore
  // gives one accent for free, so miscounting a foundation piece spends that
  // allowance and penalises the outfit the design itself uses as its example
  // ("camel knit / grey trousers / brown loafers").
  expect(isNeutral("camel")).toBe(true);
  expect(isNeutral("brown")).toBe(true);
  expect(isNeutral("navy")).toBe(true);
});
