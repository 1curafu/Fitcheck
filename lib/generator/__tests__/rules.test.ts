import { occasionBand, applyFormalityOverride, personalBand, weatherRules } from "../rules";
import { itemWarmth, warmthFit } from "../texture";

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

test("real heat excludes insulation — the measured version of the old season filter", () => {
  const hot = weatherRules({ tempC: 30, rain: false }).excludeMaterials;
  expect(hot).toEqual(expect.arrayContaining(["fleece", "down", "shearling"]));
});

test("heat no longer excludes tweed — it is scored down instead", () => {
  // Tweed left the hard list when warmth became a scored signal: its warmth is
  // in the cloth, `MATERIAL_WARMTH` reads it, and the same argument that keeps
  // wool out of this list applies to it. Both halves are asserted together on
  // purpose — dropping the exclusion without the scoring term would be a
  // regression, and this is the test that would catch it.
  const hot = weatherRules({ tempC: 32, rain: false }).excludeMaterials;
  expect(hot).not.toContain("tweed");
  expect(warmthFit([{ material: "Tweed", texture: "Twill" }], 32)).toBeLessThan(
    warmthFit([{ material: "Linen", texture: "Flat" }], 32),
  );
});

test("the dead keywords are gone — they stopped matching when material became an enum", () => {
  // `Quilted` is a TEXTURE, and `puffer` is in neither vocabulary, so both had
  // been matching nothing since item-data-completeness shipped.
  const hot = weatherRules({ tempC: 32, rain: false }).excludeMaterials;
  expect(hot).not.toContain("quilted");
  expect(hot).not.toContain("puffer");
});

test("heat does NOT exclude wool — weight and weave decide that, and we store neither", () => {
  // Tropical, fresco and high-twist wools are summer suiting, and merino is worn
  // *for* heat because it wicks. `items.material` holds a bare fibre name, so a
  // "wool" rule cannot tell a summer-weight trouser from a melton coat — it
  // would bin the smart-casual work wear this app exists to style. Off-season
  // wool is handled softly by the seasonFit term instead.
  const hot = weatherRules({ tempC: 34, rain: false }).excludeMaterials;
  expect(hot).not.toContain("wool");
  expect(hot).not.toContain("merino wool");
  expect(hot).not.toContain("cashmere");
});

test("a pleasant day excludes nothing — the threshold is properly hot, not merely warm", () => {
  expect(weatherRules({ tempC: 24, rain: false }).excludeMaterials).toEqual([]);
  expect(weatherRules({ tempC: 25, rain: false }).excludeMaterials).toEqual([]);
});

test("a hot rainy day excludes both sets", () => {
  const both = weatherRules({ tempC: 30, rain: true }).excludeMaterials;
  expect(both).toEqual(expect.arrayContaining(["suede", "canvas", "fleece"]));
});

test("cold days are unaffected by the heat rule", () => {
  expect(weatherRules({ tempC: 5, rain: false }).excludeMaterials).toEqual([]);
  expect(weatherRules({ tempC: 5, rain: false }).needsOuterwear).toBe(true);
});

// ── Rain guard, the settings toggle ──────────────────────────────────────────

test("rain guard off means rain stops excluding suede and canvas", () => {
  expect(weatherRules({ tempC: 16, rain: true }, { rainGuard: false }).excludeMaterials).toEqual([]);
});

test("rain guard defaults ON when no preferences are passed", () => {
  // Every existing caller passes one argument. The protective behaviour already
  // shipped, so the default must preserve it rather than quietly opting the
  // whole userbase out.
  expect(weatherRules({ tempC: 16, rain: true }).excludeMaterials).toEqual(
    expect.arrayContaining(["suede", "canvas"]),
  );
  expect(weatherRules({ tempC: 16, rain: true }, {}).excludeMaterials).toEqual(
    expect.arrayContaining(["suede", "canvas"]),
  );
});

test("rain guard does not reach the heat exclusions", () => {
  // The heat list is about comfort in 30°, not about protecting shoes from
  // water. A switch labelled "never suede in the rain" must not silently also
  // put a shearling coat back into a July outfit.
  const hot = weatherRules({ tempC: 30, rain: true }, { rainGuard: false }).excludeMaterials;
  expect(hot).toEqual(expect.arrayContaining(["fleece", "down", "shearling"]));
  expect(hot).not.toContain("suede");
});

test("rain guard does not reach the outerwear rule", () => {
  expect(weatherRules({ tempC: 12, rain: true }, { rainGuard: false }).needsOuterwear).toBe(true);
});

// ── The look is built for the day's HIGH, not for this minute ────────────────
// Reported 2026-08-14: at 07:45, 20°C, the drop offered a cable-knit sweater
// for a day that reached 34.8°C. The daily drop is generated ONCE and worn all
// day, so scoring against `tempC` optimises for the minute the app happened to
// be opened. `planningTemp` is the fix.

test("the heat rules read the day's high, not the current temperature", () => {
  const morningOfAHotDay = { tempC: 20, rain: false, highC: 34, lowC: 20 };
  expect(weatherRules(morningOfAHotDay).excludeMaterials).toEqual(
    expect.arrayContaining(["fleece", "down", "shearling"]),
  );
  expect(weatherRules(morningOfAHotDay).maxWarmth).toBe(0.6);
});

test("outerwear follows the high too, so a coat never lands in a 30° flat-lay", () => {
  // The cold end of the day is handled by ADVICE, not by putting a coat in the
  // look. A 9°-morning / 22°-afternoon day must not dress you in a jacket.
  expect(weatherRules({ tempC: 9, rain: false, highC: 22, lowC: 9 }).needsOuterwear).toBe(false);
  // A day that stays cold still gets one.
  expect(weatherRules({ tempC: 2, rain: false, highC: 6, lowC: -1 }).needsOuterwear).toBe(true);
});

test("with no day range the rules fall back to the current temperature", () => {
  // Every existing caller and fixture passes only tempC; behaviour must be
  // byte-identical for them.
  expect(weatherRules({ tempC: 30, rain: false }).excludeMaterials).toEqual(
    weatherRules({ tempC: 30, rain: false, highC: 30 }).excludeMaterials,
  );
  expect(weatherRules({ tempC: 10, rain: false }).needsOuterwear).toBe(true);
});

test("rain still reads the hour you step outside, not the day", () => {
  // Wet materials are about the pavement now; heat is about the afternoon.
  const hotAndRainy = { tempC: 20, rain: true, highC: 34 };
  expect(weatherRules(hotAndRainy).excludeMaterials).toEqual(
    expect.arrayContaining(["suede", "canvas", "fleece"]),
  );
});

test("warmth becomes a hard bar only on a genuinely sweltering day", () => {
  expect(weatherRules({ tempC: 25, rain: false }).maxWarmth).toBeNull();
  expect(weatherRules({ tempC: 28, rain: false }).maxWarmth).toBeNull();
  expect(weatherRules({ tempC: 29, rain: false }).maxWarmth).toBe(0.6);
});

test("the sweltering bar separates the wearer's own cable knits", () => {
  // The whole reason it reads itemWarmth rather than a keyword list: a cable
  // knit tagged Summer clears the bar, the same garment tagged Autumn/Winter
  // does not. A material list cannot express that — both are Cotton.
  const bar = weatherRules({ tempC: 24, rain: false, highC: 34 }).maxWarmth!;
  expect(itemWarmth("Cotton", "Cable knit", ["Spring", "Summer"])).toBeLessThan(bar);
  expect(itemWarmth("Cotton", "Cable knit", ["Autumn", "Winter"])).toBeGreaterThanOrEqual(bar);
});
