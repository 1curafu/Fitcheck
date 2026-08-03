import { currentStreak } from "../streak";

test("consecutive days ending today count", () => {
  expect(currentStreak(["2026-07-22", "2026-07-23", "2026-07-24"], "2026-07-24")).toBe(3);
});

test("a streak ending yesterday still counts — it has not broken until today ends", () => {
  expect(currentStreak(["2026-07-22", "2026-07-23"], "2026-07-24")).toBe(2);
});

test("a gap ends the streak", () => {
  expect(currentStreak(["2026-07-20", "2026-07-23", "2026-07-24"], "2026-07-24")).toBe(2);
});

test("nothing logged for two days means no streak", () => {
  expect(currentStreak(["2026-07-21"], "2026-07-24")).toBe(0);
});

test("duplicates on one day count once", () => {
  expect(currentStreak(["2026-07-24", "2026-07-24", "2026-07-23"], "2026-07-24")).toBe(2);
});

test("an empty history is zero, not NaN", () => {
  expect(currentStreak([], "2026-07-24")).toBe(0);
});

test("the streak crosses a month boundary", () => {
  expect(currentStreak(["2026-06-30", "2026-07-01"], "2026-07-01")).toBe(2);
});

// Counting back over 1 March in a leap year must not skip 29 February.
test("the streak crosses a leap day", () => {
  expect(currentStreak(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01")).toBe(3);
});

// The diary pages backwards, but the streak is always "as of today" — a future
// log (a wear recorded on a device ahead of this one) must not extend it.
test("dates after today do not count toward the streak", () => {
  expect(currentStreak(["2026-07-24", "2026-07-25", "2026-07-26"], "2026-07-24")).toBe(1);
});
