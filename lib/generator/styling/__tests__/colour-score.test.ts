import { colourScore } from "../colour-score";

// The reported defect, end to end: sky shirt + stone trousers, three shoes.
const SHIRT = ["sky"];
const TROUSERS = ["stone"];

test("the blue-swoosh sneaker wins — echo plus temperature", () => {
  const swoosh = colourScore([SHIRT, TROUSERS, ["white", "sky"]]);
  const cream = colourScore([SHIRT, TROUSERS, ["cream"]]);
  expect(swoosh).toBeGreaterThan(cream);
});

test("the plain white sneaker also beats the cream one, on temperature alone", () => {
  const white = colourScore([SHIRT, TROUSERS, ["white"]]);
  const cream = colourScore([SHIRT, TROUSERS, ["cream"]]);
  expect(white).toBeGreaterThan(cream);
});

test("navy + white no longer ties a muddy all-neutral pile", () => {
  const canonical = colourScore([["navy"], ["white"], ["black"]]);
  const muddy = colourScore([["taupe"], ["khaki"], ["stone"]]);
  expect(canonical).toBeGreaterThan(muddy);
});

test("the score stays inside 0..1", () => {
  const s = colourScore([["rust"], ["olive"], ["camel"], ["navy"], ["pink"]]);
  expect(s).toBeGreaterThanOrEqual(0);
  expect(s).toBeLessThanOrEqual(1);
});

test("an outfit of entirely unresearched colours still scores, via harmony", () => {
  // No pairing data, no temperature split — must not throw or return NaN.
  const s = colourScore([["green"], ["plum"], ["taupe"]]);
  expect(Number.isFinite(s)).toBe(true);
});

// --- accent_color (the PR #56 / #57 seam) -----------------------------------
// #57 moved logos, soles and hardware out of `colors` into `accent_color`. The
// echo rule above was written when they were still in `colors`, so the swoosh
// stopped echoing the moment the tagger changed. These three tests pin the
// contract: the accent reaches `echoScore` and NOTHING else.

test("an accent carried in accent_color echoes exactly as one carried in colors", () => {
  const inColors = colourScore([SHIRT, TROUSERS, ["white", "sky"]]);
  const inAccent = colourScore([SHIRT, TROUSERS, ["white"]], [null, null, "sky"]);
  expect(inAccent).toBeCloseTo(inColors, 10);
});

test("the swoosh sneaker beats the identical sneaker without the accent", () => {
  const swoosh = colourScore([SHIRT, TROUSERS, ["white"]], [null, null, "sky"]);
  const plain = colourScore([SHIRT, TROUSERS, ["white"]]);
  expect(swoosh).toBeGreaterThan(plain);
});

test("an accent reaches echo ONLY — never harmony, temperature or pairing", () => {
  // `rust` against a sky/stone base is warm, unrated and a third distinct
  // accent: folding it into the dominant colours costs real score. As an
  // ORPHAN accent it changes nothing at all here — echo already returns 0.35
  // for the unsupported `sky`, and the other three terms never see it.
  const asAccent = colourScore([SHIRT, TROUSERS, ["white"]], [null, null, "rust"]);
  const asColour = colourScore([SHIRT, TROUSERS, ["white", "rust"]]);
  const none = colourScore([SHIRT, TROUSERS, ["white"]]);
  expect(asAccent).toBeCloseTo(none, 10);
  expect(asColour).toBeLessThan(none);
});
