import { temperatureCoherence } from "../temperature";

test("a single-temperature outfit is perfectly coherent", () => {
  // ⚠️ Cool GARMENT colours, not achromatics: white and charcoal are
  // temperature-neutral since 2026-09-08 and cast no vote at all.
  expect(temperatureCoherence([["navy"], ["sky"], ["teal"]])).toBe(1);
});

test("an even warm/cool split is the no-opinion midpoint, not a punishment", () => {
  // Two warm, two cool: nothing dominates. This used to floor at 0 — as
  // incoherent as a five-colour clash — while carrying 0.30 of the weight,
  // which is what zeroed the warm+cool pairings the pairing table rates 5
  // (camel + navy). 0.5 is the same "no opinion" midpoint echoScore uses for
  // "nothing to reward or punish."
  const even = temperatureCoherence([["cream"], ["camel"], ["navy"], ["sky"]]);
  expect(even).toBe(0.5);
});

test("one warm accent on a cool base still dominates and scores well", () => {
  // 3 cool / 1 warm = a 75/25 split, comfortably past the 70/30 threshold.
  const dominated = temperatureCoherence([["navy"], ["sky"], ["teal"], ["camel"]]);
  expect(dominated).toBeGreaterThan(0.7);
});

test("a compliant 70/30 split scores at the top, not in the middle", () => {
  // The rule says one temperature must dominate ~70/30. A formula that scores
  // that in the middle would punish the ratio the rule permits — this pins it
  // at the ceiling.
  //
  // 7 cool (navy, indigo, blue, sky, teal, sage, forest) / 3 warm (camel,
  // cream, tan) is an exact 70/30 split per colour-table.ts. ⚠️ Rebuilt
  // 2026-09-08: the original array leaned on charcoal, white and denim as cool,
  // and all three became temperature-neutral. NOTE: the brief's
  // original 6-colour array (navy/charcoal/white/sky vs camel/cream) is only a
  // 4:2 = 66.7/33.3 split against the actual (unmodifiable) colour-table.ts
  // classifications, which fails to reach the ceiling — that was a data bug in
  // the brief's example, not a formula bug. Swapped for a genuine 70/30 array
  // so the test actually pins what its name says.
  const seventyThirty = temperatureCoherence([
    ["navy"], ["indigo"], ["blue"], ["sky"], ["teal"],
    ["sage"], ["forest"], ["camel"], ["cream"], ["tan"],
  ]);
  expect(seventyThirty).toBeCloseTo(1);
});

test("the reported defect: cool shirt + cool shoe beats cool shirt + warm shoe", () => {
  // stone and white are neutral now, so the cool side is carried by real cool
  // colours; the point of the test is unchanged — a warm shoe dilutes a cool
  // outfit and a neutral one does not.
  const withWhite = temperatureCoherence([["sky"], ["navy"], ["white"]]);
  const withCream = temperatureCoherence([["sky"], ["navy"], ["cream"]]);
  expect(withWhite).toBeGreaterThan(withCream!);
});

test("temperature-neutral colours are ignored, not counted as a side", () => {
  // taupe/green/pink lean neither way; they must not manufacture a split.
  expect(temperatureCoherence([["navy"], ["sky"], ["taupe"]])).toBe(1);
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
  const twoToneShoe = temperatureCoherence([["sky"], ["navy", "teal"]]);
  const twoSeparateCoolGarments = temperatureCoherence([["sky"], ["navy"]]);
  expect(twoToneShoe).toBe(twoSeparateCoolGarments);
});

test("a garment carrying both temperatures contributes one vote to each side", () => {
  // ["cream", "navy"] on ONE garment (e.g. a two-tone bag) is one warm vote and
  // one cool vote — never two of the same side, and never zero.
  const mixed = temperatureCoherence([["cream", "navy"], ["sky"]]);
  // sky is cool, so total = warm 1 / cool 2, share = 2/3 — some dominance,
  // short of the 70/30 ceiling.
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
    ["navy"], ["indigo"], ["blue"], ["sky"], ["teal"],
    ["sage"], ["forest"], ["camel"], ["cream"], ["tan"],
  ]);
  expect(seventyThirty).toBeCloseTo(1);
});

// ---------------------------------------------------------------------------
// The research's own outfit tests (fitcheck-temperature-dominance-stylist-
// judgment.md, "Real Outfit Tests" A-H). They are stated there as expected
// outcomes, so they transcribe directly rather than being invented here.
//
// null = "not applicable": fewer than two temperature-bearing garments. The
// research is explicit that this is the right answer and must not be scored as
// a bonus or a penalty.
// ---------------------------------------------------------------------------

test("A: white shirt + camel trousers + white sneakers is NOT cool-dominant", () => {
  // The measured defect. With achromatics cool this counted 2 cool vs 1 warm.
  expect(temperatureCoherence([["white"], ["camel"], ["white"]])).toBeNull();
  // ...and a camel bag makes it unanimously warm rather than a 2-2 clash.
  expect(temperatureCoherence([["white"], ["camel"], ["white"], ["camel"]])).toBe(1);
});

test("B: white blouse + camel trousers + white loafers + camel bag is warm-led", () => {
  expect(temperatureCoherence([["white"], ["camel"], ["white"], ["camel"]])).toBe(1);
});

test("C: black dress + camel coat + black boots + camel bag is warm-led", () => {
  // Black is a column, not a cool vote.
  expect(temperatureCoherence([["black"], ["camel"], ["black"], ["camel"]])).toBe(1);
});

test("D: charcoal trousers + cream knit + camel coat + brown boots is warm-led", () => {
  expect(temperatureCoherence([["charcoal"], ["cream"], ["camel"], ["brown"]])).toBe(1);
});

test("E: grey suit + white blouse + navy bag + navy heels is cool-led", () => {
  // Neutrals stepping back lets the navy accessories lead, which is the point.
  expect(temperatureCoherence([["grey"], ["white"], ["navy"], ["navy"]])).toBe(1);
});

test("F: an all-achromatic outfit has no temperature opinion at all", () => {
  expect(temperatureCoherence([["black"], ["white"], ["charcoal"], ["black"]])).toBeNull();
});

test("G: navy blazer + camel knit + grey trousers + brown shoes is a genuine mix", () => {
  // ⚠️ WE DIFFER FROM THE RESEARCH IN DEGREE HERE, deliberately. Its model is a
  // step function — below a 0.7 share it returns "balanced", no reward — while
  // this term is a continuous ramp, so 2:1 scores 0.917 rather than 0.5. The
  // ramp is kept because 2:1 genuinely IS more led than 1:1 and a step would
  // throw that away. What the research and this agree on is the ORDERING, which
  // is what the test pins.
  const mixed = temperatureCoherence([["navy"], ["camel"], ["grey"], ["brown"]])!;
  const even = temperatureCoherence([["navy"], ["camel"]])!;
  const unanimous = temperatureCoherence([["camel"], ["brown"], ["rust"]])!;
  expect(even).toBeLessThan(mixed);
  expect(mixed).toBeLessThan(unanimous);
  expect(even).toBe(0.5); // an even split is never a penalty
});

test("H: navy hoodie + camel cargos + white sneakers + grey bag is balanced", () => {
  expect(temperatureCoherence([["navy"], ["camel"], ["white"], ["grey"]])).toBe(0.5);
});
