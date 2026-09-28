import { buildTripNarrationPrompt, fallbackTripLookName, finalise, narrateTrip, type NarrateArgs } from "../narrate";
import { LOCALES } from "@/lib/i18n/locales";
import { outputLanguage } from "@/lib/ai/output-locale";

const args: NarrateArgs = {
  days: [
    { occasion: "work", tempC: 22, rain: false, pieces: [] },
    { occasion: "evening", tempC: 19, rain: true, pieces: [] },
  ],
  capsule: [],
  aesthetic: ["Old Money"],
  destination: "Lisbon",
  beyondHorizon: false,
};

test.each(LOCALES)("%s changes the output instruction without changing the fixed schedule", locale => {
  const prompt = buildTripNarrationPrompt({ ...args, locale });
  expect(prompt).toContain(`Write capsule_why and every day name/why in ${outputLanguage(locale)}`);
  expect(prompt).toContain("Day 1 (work, 22°C)");
  expect(prompt).toContain("Day 2 (evening, 19°C, rain)");
  expect(prompt).toContain("exactly 2 entries in the SAME ORDER");
});
test("missing Ukrainian narration uses a localized day name and retains day count", () => {
  expect(fallbackTripLookName(0, "uk")).toBe("День 1");
  const result = finalise({ capsule_why: "", days: [] }, 2, "uk");
  expect(result.days).toEqual([{ name: "День 1", why: "" }, { name: "День 2", why: "" }]);
});
test("Ukrainian stub localizes prose without changing destination or count", async () => {
  vi.stubEnv("FITCHECK_STUB_AI", "1");
  try {
    const result = await narrateTrip({ ...args, locale: "uk" });
    expect(result.days[0]).toMatchObject({ name: "День 1", why: expect.stringMatching(/Обрано/) });
    expect(result.days).toHaveLength(2);
    expect(result.capsule_why).toContain("Lisbon");
    expect(result.capsule_why).toContain("капсула");
  } finally { vi.unstubAllEnvs(); }
});

/**
 * ⚠️ The days come from the SOLVE, not from the model. A model that returns
 * fewer lines than there are days must cost the user a sentence, never leave a
 * day rendering blank.
 */
describe("finalise", () => {
  test("pads a short response to one entry per day", () => {
    const out = finalise({ capsule_why: "x", days: [{ name: "One", why: "a" }] }, 3);
    expect(out.days).toHaveLength(3);
    expect(out.days[2].name).toBe("Day 3");
    expect(out.days[2].why).toBe("");
  });

  test("truncates a long response", () => {
    const days = [1, 2, 3, 4].map((n) => ({ name: `N${n}`, why: `w${n}` }));
    expect(finalise({ capsule_why: "x", days }, 2).days).toHaveLength(2);
  });

  test("clamps an over-long name rather than rendering it", () => {
    const out = finalise(
      { capsule_why: "x", days: [{ name: "A tremendously overlong look name that will not fit", why: "w" }] },
      1,
    );
    expect(out.days[0].name.length).toBeLessThanOrEqual(40);
  });
});

// The stub is what CI runs, so it has to satisfy the same contract the model
// does — one entry per day, in order.
test("the stub returns one entry per day", async () => {
  process.env.FITCHECK_STUB_AI = "1";
  const out = await narrateTrip(args);
  expect(out.days).toHaveLength(2);
  expect(out.capsule_why).toContain("Lisbon");
});
