import { buildMonth } from "../month";

test("a month starts on Monday and pads the leading days", () => {
  // 1 July 2026 is a Wednesday, so two blanks precede it.
  const cells = buildMonth(2026, 7, "2026-07-24", []);
  expect(cells[0].inMonth).toBe(false);
  expect(cells[1].inMonth).toBe(false);
  expect(cells[2]).toMatchObject({ day: 1, inMonth: true });
});

test("the grid is a whole number of weeks", () => {
  expect(buildMonth(2026, 7, "2026-07-24", []).length % 7).toBe(0);
});

test("every day of the month is present exactly once", () => {
  const days = buildMonth(2026, 7, "2026-07-24", [])
    .filter((c) => c.inMonth)
    .map((c) => c.day);
  expect(days).toHaveLength(31);
  expect(new Set(days).size).toBe(31);
});

test("February in a leap year has 29 days", () => {
  const days = buildMonth(2028, 2, "2028-02-10", []).filter((c) => c.inMonth);
  expect(days).toHaveLength(29);
});

// A month whose 1st IS a Monday must not gain a blank leading week.
test("a month beginning on Monday has no leading pad", () => {
  const cells = buildMonth(2026, 6, "2026-06-15", []);
  expect(cells[0]).toMatchObject({ day: 1, inMonth: true });
});

test("today is marked, and only today", () => {
  const cells = buildMonth(2026, 7, "2026-07-24", []);
  expect(cells.filter((c) => c.isToday)).toHaveLength(1);
  expect(cells.find((c) => c.isToday)?.day).toBe(24);
});

test("a month that is not the current one marks no day as today", () => {
  expect(buildMonth(2026, 3, "2026-07-24", []).some((c) => c.isToday)).toBe(false);
});

test("a log attaches to its own day and no other", () => {
  const log = { worn_on: "2026-07-09", outfitId: "o1", pieces: [] };
  const cells = buildMonth(2026, 7, "2026-07-24", [log]);
  expect(cells.find((c) => c.day === 9)?.log).toEqual(log);
  expect(cells.filter((c) => c.log).length).toBe(1);
});

// A wear whose outfit was later deleted keeps its row (the FK is ON DELETE SET
// NULL by design) — it must still mark the day, it simply cannot be a link.
test("a log whose outfit is gone still attaches to its day", () => {
  const log = { worn_on: "2026-07-09", outfitId: null, pieces: [] };
  const cells = buildMonth(2026, 7, "2026-07-24", [log]);
  expect(cells.find((c) => c.day === 9)?.log).toEqual(log);
});

// Cells are React keys; a duplicate key silently drops a day from the grid.
test("every cell key is unique", () => {
  const keys = buildMonth(2026, 7, "2026-07-24", []).map((c) => c.key);
  expect(new Set(keys).size).toBe(keys.length);
});
