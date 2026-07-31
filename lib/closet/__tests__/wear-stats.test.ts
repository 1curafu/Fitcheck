import { itemWearStats } from "../wear-stats";

test("counts wears and divides the price across them", () => {
  const s = itemWearStats([{ worn_on: "2026-07-01" }, { worn_on: "2026-07-10" }], 100, "2026-07-24");
  expect(s.wears).toBe(2);
  expect(s.costPerWear).toBe("€50.00");
});

test("no price means no cost-per-wear rather than a fabricated zero", () => {
  expect(itemWearStats([{ worn_on: "2026-07-01" }], null, "2026-07-24").costPerWear).toBeNull();
});

test("a priced but never-worn item does not divide by zero", () => {
  const s = itemWearStats([], 100, "2026-07-24");
  expect(s.wears).toBe(0);
  expect(s.costPerWear).toBeNull();
});

test("last worn reads in human time, counting from the most recent wear", () => {
  expect(itemWearStats([{ worn_on: "2026-07-24" }], null, "2026-07-24").lastWorn).toBe("Today");
  expect(itemWearStats([{ worn_on: "2026-07-23" }], null, "2026-07-24").lastWorn).toBe("Yesterday");
  expect(itemWearStats([{ worn_on: "2026-07-14" }], null, "2026-07-24").lastWorn).toBe("10 days ago");
});

test("the most recent wear wins, not the first in the list", () => {
  const s = itemWearStats(
    [{ worn_on: "2026-07-01" }, { worn_on: "2026-07-23" }, { worn_on: "2026-06-02" }],
    null,
    "2026-07-24",
  );
  expect(s.lastWorn).toBe("Yesterday");
});

test("never worn says so plainly", () => {
  expect(itemWearStats([], null, "2026-07-24").lastWorn).toBe("Never");
});

// Dates are compared as calendar days, not by subtracting timestamps — a wear
// logged either side of a DST change is still exactly one day ago.
test("a wear across a DST boundary is still counted in whole days", () => {
  // Europe/London: clocks go back on 2026-10-25.
  expect(itemWearStats([{ worn_on: "2026-10-24" }], null, "2026-10-26").lastWorn).toBe("2 days ago");
});

// The daily drop is keyed on the user's LOCAL date, and so is worn_on. A log
// dated later than "today" means the clock moved, not that the future happened.
test("a wear dated ahead of today reads as Today rather than a negative count", () => {
  expect(itemWearStats([{ worn_on: "2026-07-25" }], null, "2026-07-24").lastWorn).toBe("Today");
});
