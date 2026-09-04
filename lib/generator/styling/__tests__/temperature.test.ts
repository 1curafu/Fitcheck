import { temperatureCoherence } from "../temperature";

test("a single-temperature outfit is perfectly coherent", () => {
  expect(temperatureCoherence([["navy"], ["white"], ["charcoal"]])).toBe(1);
});

test("an even warm/cool split is the no-opinion midpoint, not a punishment", () => {
  // Two warm, two cool: nothing dominates. This used to floor at 0 — as
  // incoherent as a five-colour clash — while carrying 0.30 of the weight,
  // which is what zeroed the warm+cool pairings the pairing table rates 5
  // (camel + navy). 0.5 is the same "no opinion" midpoint echoScore uses for
  // "nothing to reward or punish."
  const even = temperatureCoherence([["cream"], ["camel"], ["navy"], ["charcoal"]]);
  expect(even).toBe(0.5);
});

test("one warm accent on a cool base still dominates and scores well", () => {
  // 3 cool / 1 warm = a 75/25 split, comfortably past the 70/30 threshold.
  const dominated = temperatureCoherence([["navy"], ["charcoal"], ["white"], ["camel"]]);
  expect(dominated).toBeGreaterThan(0.7);
});

test("a compliant 70/30 split scores at the top, not in the middle", () => {
  // The rule says one temperature must dominate ~70/30. A formula that scores
  // that in the middle would punish the ratio the rule permits — this pins it
  // at the ceiling.
  //
  // 7 cool (navy, charcoal, white, sky, teal, indigo, denim) / 3 warm (camel,
  // cream, tan) is an exact 70/30 split per colour-table.ts. NOTE: the brief's
  // original 6-colour array (navy/charcoal/white/sky vs camel/cream) is only a
  // 4:2 = 66.7/33.3 split against the actual (unmodifiable) colour-table.ts
  // classifications, which fails to reach the ceiling — that was a data bug in
  // the brief's example, not a formula bug. Swapped for a genuine 70/30 array
  // so the test actually pins what its name says.
  const seventyThirty = temperatureCoherence([
    ["navy"], ["charcoal"], ["white"], ["sky"], ["teal"],
    ["indigo"], ["denim"], ["camel"], ["cream"], ["tan"],
  ]);
  expect(seventyThirty).toBeCloseTo(1);
});

test("the reported defect: cool shirt + cool shoe beats cool shirt + warm shoe", () => {
  const withWhite = temperatureCoherence([["sky"], ["stone"], ["white"]]);
  const withCream = temperatureCoherence([["sky"], ["stone"], ["cream"]]);
  expect(withWhite).toBeGreaterThan(withCream!);
});

test("temperature-neutral colours are ignored, not counted as a side", () => {
  // taupe/green/pink lean neither way; they must not manufacture a split.
  expect(temperatureCoherence([["navy"], ["white"], ["taupe"]])).toBe(1);
});

test("null when there is nothing to compare", () => {
  expect(temperatureCoherence([])).toBeNull();
  expect(temperatureCoherence([["taupe"], ["green"]])).toBeNull();
  expect(temperatureCoherence([["navy"]])).toBeNull();
});

test("a two-tone garment votes at most once per side, not once per colour token", () => {
  // A ["white", "sky"] shoe is two cool COLOURS but one cool GARMENT. If it cast
  // two cool votes instead of one, it could flip dominance on its own — the
  // exact defect this fix closes. Compare a shoe that is genuinely two cool
  // garments (sky shirt + a separate cool-only shoe) against one cool shirt
  // plus one two-tone cool shoe: both are a 2-cool/0-warm vote, so both must
  // land on the same ceiling.
  const twoToneShoe = temperatureCoherence([["sky"], ["white", "sky"]]);
  const twoSeparateCoolGarments = temperatureCoherence([["sky"], ["white"]]);
  expect(twoToneShoe).toBe(twoSeparateCoolGarments);
});

test("a garment carrying both temperatures contributes one vote to each side", () => {
  // ["cream", "navy"] on ONE garment (e.g. a two-tone bag) is one warm vote and
  // one cool vote — never two of the same side, and never zero.
  const mixed = temperatureCoherence([["cream", "navy"], ["stone"]]);
  // stone is cool-neutral (temperature "cool"), so total = warm 1 / cool 2,
  // share = 2/3 — some dominance, short of the 70/30 ceiling.
  expect(mixed).not.toBeNull();
  expect(mixed).toBeGreaterThan(0.5);
  expect(mixed).toBeLessThan(1);
});

test("the 0.5 floor: an even split never scores below the no-opinion midpoint", () => {
  const even = temperatureCoherence([["navy"], ["camel"]]);
  expect(even).toBe(0.5);
});

test("a 70/30 split still reaches the 1.0 ceiling", () => {
  // 7 cool / 3 warm, same array as the compliance test above — pinned again
  // here specifically against the floor/ceiling rescale.
  const seventyThirty = temperatureCoherence([
    ["navy"], ["charcoal"], ["white"], ["sky"], ["teal"],
    ["indigo"], ["denim"], ["camel"], ["cream"], ["tan"],
  ]);
  expect(seventyThirty).toBeCloseTo(1);
});
