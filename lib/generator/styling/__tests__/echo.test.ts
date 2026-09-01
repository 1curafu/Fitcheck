import { echoScore } from "../echo";

test("one repeated accent across two garments is the reward case", () => {
  // sky shirt, stone trousers, sneaker carrying a sky accent — ONE echo point.
  const withEcho = echoScore([["sky"], ["stone"], ["white", "sky"]])!;
  const without = echoScore([["sky"], ["stone"], ["white"]])!;
  expect(withEcho).toBeGreaterThan(without);
});

test("three or more echo points read as forced, not intentional", () => {
  const one = echoScore([["sky"], ["stone"], ["white", "sky"]])!;
  const many = echoScore([["sky"], ["sky", "stone"], ["sky", "white"], ["sky"]])!;
  expect(many).toBeLessThan(one);
});

test("repeating a NEUTRAL is not an echo — it is just neutral", () => {
  // Two white garments is not a styling move; only accents echo.
  expect(echoScore([["white"], ["white"], ["navy"]])).toBe(
    echoScore([["white"], ["charcoal"], ["navy"]]),
  );
});

test("no repetition at all is neutral, not penalised", () => {
  // Was [["sky"],["stone"],["white"]] — that carries the unsupported accent
  // "sky" and now correctly returns 0.35 (an orphan accent), not 0.5. Moved to
  // an all-neutral fixture so this test still tests what its name says.
  expect(echoScore([["navy"], ["stone"], ["white"]])).toBe(0.5);
});

test("null when there is nothing to compare", () => {
  expect(echoScore([])).toBeNull();
  expect(echoScore([["navy"]])).toBeNull();
});

test("an accent nothing supports scores BELOW an outfit with no accent at all", () => {
  // White shirt, stone trousers. The blue on the sneaker echoes nothing.
  const orphan = echoScore([["white"], ["stone"], ["white", "sky"]])!;
  const clean = echoScore([["white"], ["stone"], ["white", "black"]])!;
  expect(orphan).toBeLessThan(clean);
});

test("but the SAME shoe against a shirt that supports it is still the reward case", () => {
  const supported = echoScore([["sky"], ["stone"], ["white", "sky"]])!;
  const orphan = echoScore([["white"], ["stone"], ["white", "sky"]])!;
  expect(supported).toBeGreaterThan(orphan);
  expect(supported).toBe(1);
});

test("an all-neutral outfit is still the plain 0.5 baseline, not a demerit", () => {
  // No accent is present at all — nothing to support, so nothing to fault.
  expect(echoScore([["white"], ["stone"], ["white", "black"]])).toBe(0.5);
});

test("a two-tone garment does not echo with itself", () => {
  // ⚠️ The obvious assertion here is WRONG. `["sky", "sky"]` as one garment
  // dedupes to a single "sky" — an accent that nothing ELSE in the outfit
  // supports, i.e. the orphan-accent branch (0.35), NOT the no-accent
  // baseline (0.5). Listing "sky" once on that garment reaches the exact same
  // number for the exact same reason: what matters is that repeating a colour
  // WITHIN one garment must not be counted as a second garment carrying it.
  const listedTwice = echoScore([["sky", "sky"], ["stone"], ["white"]]);
  const listedOnce = echoScore([["sky"], ["stone"], ["white"]]);
  expect(listedTwice).toBe(listedOnce);
  expect(listedTwice).toBe(0.35);
});
