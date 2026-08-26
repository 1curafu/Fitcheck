import { scheduleDays } from "../schedule";
import type { CapsuleResult } from "../capsule";

const result: CapsuleResult = {
  itemIds: ["shirt", "trouser", "loafer", "tee"],
  covered: [
    { day: { date: "2026-05-12", occasion: "work" }, itemIds: ["shirt", "trouser", "loafer"] },
    { day: { date: "2026-05-13", occasion: "evening" }, itemIds: ["tee", "trouser", "loafer"] },
    { day: { date: "2026-05-14", occasion: "work" }, itemIds: ["shirt", "trouser", "loafer"] },
  ],
  uncovered: [],
};

test("numbers each wear in date order", () => {
  const days = scheduleDays(result);
  expect(days[0].wearIndex).toEqual({ shirt: 1, trouser: 1, loafer: 1 });
  expect(days[1].wearIndex).toEqual({ tee: 1, trouser: 2, loafer: 2 });
  expect(days[2].wearIndex).toEqual({ shirt: 2, trouser: 3, loafer: 3 });
});

test("keeps the day's own items and occasion", () => {
  const days = scheduleDays(result);
  expect(days[1].itemIds).toEqual(["tee", "trouser", "loafer"]);
  expect(days[1].day.occasion).toBe("evening");
});

test("an empty result schedules nothing", () => {
  expect(scheduleDays({ itemIds: [], covered: [], uncovered: [] })).toEqual([]);
});

// Uncovered days are the shortfall screen's business, not the day list's — a
// day with no outfit must not appear as a day with an empty one.
test("schedules only the days that were actually covered", () => {
  const partial: CapsuleResult = {
    itemIds: ["shirt"],
    covered: [{ day: { date: "2026-05-12", occasion: "work" }, itemIds: ["shirt"] }],
    uncovered: [{ date: "2026-05-13", occasion: "evening" }],
  };
  const days = scheduleDays(partial);
  expect(days).toHaveLength(1);
  expect(days[0].day.date).toBe("2026-05-12");
});

// A piece worn twice on one day (a jacket counted once per outfit) must not
// silently skip a number — the count is what the screen renders.
test("counts a repeated id within one day", () => {
  const twice: CapsuleResult = {
    itemIds: ["scarf"],
    covered: [{ day: { date: "2026-05-12", occasion: "work" }, itemIds: ["scarf", "scarf"] }],
    uncovered: [],
  };
  expect(scheduleDays(twice)[0].wearIndex).toEqual({ scarf: 2 });
});
