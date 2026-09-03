import { echoedAccents, echoScore } from "../echo";

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

// ── echoedAccents: the same counting, exposed by name ────────────────────────
// `lib/generator/rerank.ts` prints these on the combo line so the re-ranker is
// told WHICH accent echoes instead of being asked to spot it. Sharing the
// counting with `echoScore` is the point: the sentence shown to the user and
// the score that ranked the combo cannot disagree.

test("names the accent carried by more than one garment", () => {
  expect(echoedAccents([["sky"], ["stone"], ["white", "sky"]])).toEqual(["sky"]);
});

test("says nothing when no accent repeats", () => {
  expect(echoedAccents([["sky"], ["stone"], ["white"]])).toEqual([]);
});

test("neutrals are never echoes, however often they repeat", () => {
  expect(echoedAccents([["white"], ["white"], ["white"]])).toEqual([]);
});

test("a two-tone garment does not echo with itself", () => {
  expect(echoedAccents([["sky", "sky"], ["stone"]])).toEqual([]);
});

test("a lone garment has nothing to echo with", () => {
  expect(echoedAccents([["sky", "rust"]])).toEqual([]);
});

test("every accent that repeats is named, not just the first", () => {
  expect(echoedAccents([["sky", "rust"], ["rust"], ["sky"]]).sort()).toEqual(["rust", "sky"]);
});

test("what echoScore rewards is exactly what echoedAccents names", () => {
  const echoing = [["sky"], ["stone"], ["white", "sky"]];
  const plain = [["sky"], ["stone"], ["white"]];
  expect(echoedAccents(echoing).length).toBeGreaterThan(0);
  expect(echoScore(echoing)!).toBeGreaterThan(echoScore(plain)!);
  expect(echoedAccents(plain)).toEqual([]);
});
