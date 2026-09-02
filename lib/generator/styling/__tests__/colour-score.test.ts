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
