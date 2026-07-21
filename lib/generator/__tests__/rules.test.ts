import { occasionBand, applyFormalityOverride, personalBand, weatherRules } from "../rules";

test("occasion is CONTEXT, not a dress code — each band spans its real-world spread", () => {
  // Work runs from a creative office in sneakers to a suit; Evening from a
  // casual date to black tie. Which end you land on is your dress code, not
  // the occasion. Ordering still holds: work sits smarter than everyday.
  expect(occasionBand("work")).toEqual([2, 4.5]);
  expect(occasionBand("evening")).toEqual([2.5, 5]);
  expect(occasionBand("everyday")).toEqual([1.5, 3]);
  expect(occasionBand("weekend")).toEqual([1, 3.5]);
});

test("smart casual (f=3) is a legitimate answer for EVERY occasion", () => {
  for (const o of ["everyday", "work", "weekend", "evening"] as const) {
    const [lo, hi] = occasionBand(o);
    expect(lo).toBeLessThanOrEqual(3);
    expect(hi).toBeGreaterThanOrEqual(3);
  }
});

test("an explicit Refine formality narrows the band around that level", () => {
  const band = applyFormalityOverride([2, 4.5], 2);
  expect(band[0]).toBeLessThanOrEqual(2);
  expect(band[1]).toBeLessThanOrEqual(3);
});

test("Refine can dress you UP past the occasion's ceiling — it's an explicit instruction", () => {
  // A smart-casual wardrobe asking for a black-tie evening must not be capped
  // at its usual ceiling; the whole point of Refine is to override.
  expect(applyFormalityOverride([2.5, 3.5], 5)).toEqual([4, 5]);
});

test("Refine clamps to the 1..5 scale", () => {
  expect(applyFormalityOverride([2, 4.5], 1)).toEqual([1, 2]);
  expect(applyFormalityOverride([2, 4.5], 5)).toEqual([4, 5]);
});

test("no override returns the band unchanged", () => {
  expect(applyFormalityOverride([3, 4.5], null)).toEqual([3, 4.5]);
});
// --- the dress code the quiz collected actually gets used --------------------

const smartCasual = { formality_min: 3, formality_max: 3 }; // dress_codes: {Smart casual}

test("a smart-casual wardrobe gets smart-casual WORK and EVENING, not a suit", () => {
  for (const o of ["work", "evening"] as const) {
    const [lo, hi] = personalBand(o, smartCasual);
    expect(lo).toBeLessThanOrEqual(3);
    expect(hi).toBeGreaterThanOrEqual(3);
    expect(hi).toBeLessThan(5); // never demands black tie of someone who said smart casual
  }
});

test("a single dress code is padded so the band isn't a knife-edge", () => {
  const [lo, hi] = personalBand("work", smartCasual);
  expect(hi - lo).toBeGreaterThan(0);
});

test("multiple dress codes widen the band", () => {
  const [lo, hi] = personalBand("work", { formality_min: 2, formality_max: 4 });
  const [slo, shi] = personalBand("work", smartCasual);
  expect(lo).toBeLessThanOrEqual(slo);
  expect(hi).toBeGreaterThanOrEqual(shi);
});

test("no profile answer → the plain occasion band", () => {
  expect(personalBand("work", null)).toEqual(occasionBand("work"));
  expect(personalBand("work", { formality_min: null, formality_max: null })).toEqual(
    occasionBand("work"),
  );
});

test("a dress code with NO overlap falls back to the occasion rather than yielding nothing", () => {
  // Black-tie-only wardrobe asked for Everyday [1.5,3]: no overlap at all.
  expect(personalBand("everyday", { formality_min: 5, formality_max: 5 })).toEqual(
    occasionBand("everyday"),
  );
});

test("the personal band never escapes the occasion's range", () => {
  const [olo, ohi] = occasionBand("everyday");
  const [lo, hi] = personalBand("everyday", { formality_min: 1, formality_max: 5 });
  expect(lo).toBeGreaterThanOrEqual(olo);
  expect(hi).toBeLessThanOrEqual(ohi);
});

test("cold (<15°) needs outerwear; mild does not", () => {
  expect(weatherRules({ tempC: 12, rain: false }).needsOuterwear).toBe(true);
  expect(weatherRules({ tempC: 18, rain: false }).needsOuterwear).toBe(false);
});
test("rain excludes suede + canvas", () => {
  expect(weatherRules({ tempC: 16, rain: true }).excludeMaterials).toEqual(
    expect.arrayContaining(["suede", "canvas"]),
  );
  expect(weatherRules({ tempC: 16, rain: false }).excludeMaterials).toEqual([]);
});
