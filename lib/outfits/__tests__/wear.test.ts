import { freshIndexStart, isWornToday, wearLabel } from "../wear";

test("the button says what it will do, then what it did", () => {
  // Design :362 — wearLabel is dynamic, so the button reflects state.
  expect(wearLabel(false)).toBe("Wear this today");
  expect(wearLabel(true)).toBe("Worn today");
});

test("a wear counts for today only when its local date matches", () => {
  expect(isWornToday([{ worn_on: "2026-07-24" }], "2026-07-24")).toBe(true);
  expect(isWornToday([{ worn_on: "2026-07-23" }], "2026-07-24")).toBe(false);
  expect(isWornToday([], "2026-07-24")).toBe(false);
});

test("an outfit worn on several days is still worn today if one of them is today", () => {
  expect(isWornToday([{ worn_on: "2026-07-01" }, { worn_on: "2026-07-24" }], "2026-07-24")).toBe(
    true,
  );
});

// The pin: a worn outfit survives a Regenerate, so the new set has to be placed
// AROUND it. outfits_daily_unique is (user_id, occasion, generated_on,
// look_index), so reusing a pinned index is a constraint violation, not a
// cosmetic clash.
test("a regenerate with nothing pinned starts at zero, exactly as before", () => {
  expect(freshIndexStart([])).toBe(0);
});

test("a regenerate places the new set past every pinned index", () => {
  expect(freshIndexStart([0])).toBe(1);
  expect(freshIndexStart([1])).toBe(2);
  // Two worn looks, and the gap at 1 is deliberately not reused — indices only
  // ever move forward, so a second regenerate cannot collide with the first.
  expect(freshIndexStart([0, 2])).toBe(3);
});

test("a pinned look with no index does not drag the new set back to zero", () => {
  // look_index is nullable in the schema; a null must not read as index 0.
  expect(freshIndexStart([null, 3])).toBe(4);
  expect(freshIndexStart([null])).toBe(0);
});
