import { parseMonth, monthBounds, latestPerDay, shiftMonth } from "../logs";

describe("parseMonth", () => {
  test("reads a well-formed ?m", () => {
    expect(parseMonth("2026-03", "2026-07-24")).toEqual({ year: 2026, month: 3 });
  });

  test("falls back to today's month when absent", () => {
    expect(parseMonth(undefined, "2026-07-24")).toEqual({ year: 2026, month: 7 });
  });

  // ?m is user-controlled; a bad value must show this month, never crash or
  // render a grid for month 0.
  test.each(["", "nonsense", "2026-13", "2026-00", "26-3", "2026-3", "0000-01"])(
    "falls back on the malformed value %o",
    (bad) => {
      expect(parseMonth(bad, "2026-07-24")).toEqual({ year: 2026, month: 7 });
    },
  );
});

describe("monthBounds", () => {
  test("covers the whole month inclusively", () => {
    expect(monthBounds(2026, 7)).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  test("February in a leap year ends on the 29th", () => {
    expect(monthBounds(2028, 2)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  test("a 30-day month does not overrun", () => {
    expect(monthBounds(2026, 6).end).toBe("2026-06-30");
  });
});

describe("shiftMonth", () => {
  test("steps back across a year boundary", () => {
    expect(shiftMonth(2026, 1, -1)).toBe("2025-12");
  });

  test("steps forward across a year boundary", () => {
    expect(shiftMonth(2026, 12, 1)).toBe("2027-01");
  });

  test("pads a single-digit month", () => {
    expect(shiftMonth(2026, 8, -1)).toBe("2026-07");
  });
});

describe("latestPerDay", () => {
  // wear_logs permits several outfits on one date; the grid has room for one.
  test("the most recent wear wins a day", () => {
    const picked = latestPerDay([
      { worn_on: "2026-07-09", outfit_id: "early", created_at: "2026-07-09T08:00:00Z" },
      { worn_on: "2026-07-09", outfit_id: "late", created_at: "2026-07-09T19:00:00Z" },
    ]);
    expect(picked).toHaveLength(1);
    expect(picked[0].outfit_id).toBe("late");
  });

  test("separate days each keep their own wear", () => {
    const picked = latestPerDay([
      { worn_on: "2026-07-09", outfit_id: "a", created_at: "2026-07-09T08:00:00Z" },
      { worn_on: "2026-07-10", outfit_id: "b", created_at: "2026-07-10T08:00:00Z" },
    ]);
    expect(picked.map((r) => r.outfit_id).sort()).toEqual(["a", "b"]);
  });

  // created_at is nullable on wear_logs (it only has a default).
  test("a row with no timestamp loses to one that has it, but still counts alone", () => {
    expect(
      latestPerDay([
        { worn_on: "2026-07-09", outfit_id: "null-ts", created_at: null },
        { worn_on: "2026-07-09", outfit_id: "stamped", created_at: "2026-07-09T08:00:00Z" },
      ])[0].outfit_id,
    ).toBe("stamped");
    expect(
      latestPerDay([{ worn_on: "2026-07-09", outfit_id: "only", created_at: null }]),
    ).toHaveLength(1);
  });

  test("an empty list yields nothing", () => {
    expect(latestPerDay([])).toEqual([]);
  });
});
