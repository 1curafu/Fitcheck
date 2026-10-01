import { FITS } from "@/lib/ai/tagging-schema";
import { QUESTIONS } from "@/lib/onboarding/questions";
import { FIT_CLASH, FIT_SUITS, fitScore, fitSuits } from "../fit-pref";

test("the preferences are exactly the quiz's fit answers, and every fit named is a real tag", () => {
  const quiz = QUESTIONS.find((q) => q.id === "fit")!.options.map((o) => o.value).sort();
  expect(Object.keys(FIT_SUITS).sort()).toEqual(quiz);
  for (const fits of Object.values(FIT_SUITS)) for (const f of fits) expect(FITS).toContain(f);
});

test.each([
  ["Tailored", "Fitted", true], ["Tailored", "Tailored", true], ["Tailored", "Regular", true],
  ["Tailored", "Relaxed", false], ["Tailored", "Oversized", false],
  ["Relaxed", "Regular", true], ["Relaxed", "Relaxed", true], ["Relaxed", "Fitted", false], ["Relaxed", "Oversized", false],
  ["Oversized", "Relaxed", true], ["Oversized", "Oversized", true], ["Oversized", "Fitted", false], ["Oversized", "Tailored", false],
])("%s suits %s: %s", (pref, fit, expected) => {
  expect(fitSuits(fit, pref)).toBe(expected);
});

describe("fitScore", () => {
  const f = (category: string, fit: string | null) => ({ category, fit });
  test("no preference, an unknown one, or no tagged clothing: no opinion", () => {
    expect(fitScore([f("Tops", "Fitted")], null)).toBeNull();
    expect(fitScore([f("Tops", "Fitted")], "Boxy")).toBeNull();
    expect(fitScore([f("Tops", null), f("Shoes", "Fitted")], "Tailored")).toBeNull();
  });
  test("the share of tagged clothing that suits; untagged pieces and shoes do not count", () => {
    expect(fitScore([f("Tops", "Relaxed"), f("Bottoms", "Fitted"), f("Outerwear", null), f("Shoes", "Fitted")], "Relaxed")).toBe(0.5);
    expect(fitScore([f("Tops", "Oversized"), f("One-piece", "Relaxed")], "Oversized")).toBe(1);
  });
});

describe("neutral cuts (the spec table leaves them unlisted) are not the opposite of the preference", () => {
  const f = (category: string, fit: string | null) => ({ category, fit });

  test("every fit is exactly one of: suits, clashes, or neutral — no overlap", () => {
    for (const pref of Object.keys(FIT_SUITS) as (keyof typeof FIT_SUITS)[]) {
      for (const fit of FIT_SUITS[pref]) expect(FIT_CLASH[pref]).not.toContain(fit);
    }
  });

  test("Oversized: Relaxed/Oversized suit, Fitted/Tailored clash, Regular is NEUTRAL (half credit)", () => {
    // ⚠️ Opus review: Regular was scored like Fitted for an Oversized user, though it is the most common tag.
    expect(fitScore([f("Tops", "Relaxed")], "Oversized")).toBe(1);
    expect(fitScore([f("Tops", "Fitted")], "Oversized")).toBe(0);
    expect(fitScore([f("Tops", "Regular")], "Oversized")).toBe(0.5);
  });

  test("Relaxed: Tailored is neutral; Fitted and Oversized clash", () => {
    expect(fitScore([f("Tops", "Tailored")], "Relaxed")).toBe(0.5);
    expect(fitScore([f("Tops", "Fitted")], "Relaxed")).toBe(0);
    expect(fitScore([f("Tops", "Oversized")], "Relaxed")).toBe(0);
  });

  test("a closet of Regular pieces is no longer pushed down as hard as a clash", () => {
    expect(fitScore([f("Tops", "Regular"), f("Bottoms", "Regular")], "Oversized")).toBeGreaterThan(fitScore([f("Tops", "Fitted"), f("Bottoms", "Fitted")], "Oversized")!);
  });
});
