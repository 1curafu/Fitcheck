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
  expect(echoScore([["sky"], ["stone"], ["white"]])).toBe(0.5);
});

test("null when there is nothing to compare", () => {
  expect(echoScore([])).toBeNull();
  expect(echoScore([["navy"]])).toBeNull();
});
