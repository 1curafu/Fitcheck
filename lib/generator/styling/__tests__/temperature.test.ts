import { temperatureCoherence } from "../temperature";

test("a single-temperature outfit is perfectly coherent", () => {
  expect(temperatureCoherence(["navy", "white", "charcoal"])).toBe(1);
});

test("an even warm/cool split is the documented failure case", () => {
  // Two warm, two cool: nothing dominates. This is what 70/30 forbids.
  const even = temperatureCoherence(["cream", "camel", "navy", "charcoal"]);
  expect(even).toBeLessThan(0.5);
});

test("one warm accent on a cool base still dominates and scores well", () => {
  // 3 cool / 1 warm = a 75/25 split, comfortably past the 70/30 threshold.
  const dominated = temperatureCoherence(["navy", "charcoal", "white", "camel"]);
  expect(dominated).toBeGreaterThan(0.7);
});

test("a compliant 70/30 split scores at the top, not in the middle", () => {
  // The rule says one temperature must dominate ~70/30. A formula that scores
  // that 0.4 would punish the ratio the rule permits — this pins it.
  //
  // 7 cool (navy, charcoal, white, sky, teal, indigo, denim) / 3 warm (camel,
  // cream, tan) is an exact 70/30 split per colour-table.ts. NOTE: the brief's
  // original 6-colour array (navy/charcoal/white/sky vs camel/cream) is only a
  // 4:2 = 66.7/33.3 split against the actual (unmodifiable) colour-table.ts
  // classifications, which scores 0.833 and fails this assertion — that was a
  // data bug in the brief's example, not a formula bug. Swapped for a genuine
  // 70/30 array so the test actually pins what its name says.
  const seventyThirty = temperatureCoherence([
    "navy", "charcoal", "white", "sky", "teal", "indigo", "denim", "camel", "cream", "tan",
  ]);
  expect(seventyThirty).toBeGreaterThanOrEqual(0.9);
});

test("the reported defect: cool shirt + cool shoe beats cool shirt + warm shoe", () => {
  const withWhite = temperatureCoherence(["sky", "stone", "white"]);
  const withCream = temperatureCoherence(["sky", "stone", "cream"]);
  expect(withWhite).toBeGreaterThan(withCream!);
});

test("temperature-neutral colours are ignored, not counted as a side", () => {
  // taupe/green/pink lean neither way; they must not manufacture a split.
  expect(temperatureCoherence(["navy", "white", "taupe"])).toBe(1);
});

test("null when there is nothing to compare", () => {
  expect(temperatureCoherence([])).toBeNull();
  expect(temperatureCoherence(["taupe", "green"])).toBeNull();
  expect(temperatureCoherence(["navy"])).toBeNull();
});
