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

// --- an accent is a ROLE, not a palette class (2026-09-03) -------------------
// `isNeutral` governs whether a colour can ANCHOR an outfit (the harmony
// ceiling); it is not the question echo asks. navy stays neutral in vocab.ts —
// what changed is that echo no longer borrows that answer.

test("a navy swoosh picking up a navy top beats the same sneaker without it", () => {
  const swoosh = colourScore([["navy"], ["white"], ["white"]], [null, null, "navy"]);
  const plain = colourScore([["navy"], ["white"], ["white"]]);
  expect(swoosh).toBeGreaterThan(plain);
});

test("two navy GARMENTS score no echo — tonal dressing is a separate concept", () => {
  // ⚠️ The line the rule must not cross. If a neutral dominant could echo
  // another neutral dominant, every navy-and-white wardrobe would read as a
  // deliberate colour story and the reward would mean nothing.
  const tonal = colourScore([["navy"], ["navy"], ["white"]]);
  const tonalWithAccent = colourScore([["navy"], ["white"], ["white"]], [null, null, "navy"]);
  expect(tonal).toBeLessThan(tonalWithAccent);
  expect(tonal).toBe(colourScore([["navy"], ["navy"], ["white"]], [null, null, null]));
});
