import { occasionBand, applyFormalityOverride, weatherRules } from "../rules";

test("Work sits smarter than Everyday", () => {
  expect(occasionBand("work")).toEqual([3, 4.5]);
  expect(occasionBand("everyday")).toEqual([1.5, 3]);
});
test("Evening is the dressiest, Weekend the most relaxed-wide", () => {
  expect(occasionBand("evening")).toEqual([3.5, 5]);
  expect(occasionBand("weekend")).toEqual([1.5, 3.5]);
});
test("an explicit Refine formality narrows the band around that level", () => {
  const band = applyFormalityOverride([3, 4.5], 2);
  expect(band[0]).toBeLessThanOrEqual(2);
  expect(band[1]).toBeLessThanOrEqual(3);
});
test("no override returns the band unchanged", () => {
  expect(applyFormalityOverride([3, 4.5], null)).toEqual([3, 4.5]);
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
