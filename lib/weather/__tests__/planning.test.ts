import { planningTempFor, occasionWindow } from "../planning";
import type { HourCell } from "@/lib/generator/types";

/** Hours from `h` onward at the given temperatures. */
const from = (h: number, temps: number[]): HourCell[] =>
  temps.map((t, k) => ({
    hh: `${String(h + k).padStart(2, "0")}:00`,
    tempC: t,
    rain: false,
    isNow: k === 0,
  }));

// An autumn day: peaks at 18° mid-afternoon, 7° by the time anyone goes out.
// This is the shape that makes the whole module necessary — in August the
// difference is nearly free, because the evening is still as hot as the peak.
const autumnDay = from(9, [11, 13, 15, 17, 18, 17, 15, 12, 10, 8, 7, 7, 7]); // 09:00 → 21:00

test("an Evening look is built for the evening, not the afternoon peak", () => {
  expect(planningTempFor("evening", autumnDay, 11)).toBe(8);
  expect(planningTempFor("everyday", autumnDay, 11)).toBe(18);
});

test("a Work look stops at the end of the working day", () => {
  // 18:00 is 8° here; including the evening would not change the max, so use a
  // day that rises late to prove the boundary actually bites.
  const oddDay = from(9, [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 25]); // 19:00 = 25°
  expect(planningTempFor("work", oddDay, 10)).toBe(10);
  expect(planningTempFor("everyday", oddDay, 10)).toBe(25);
});

test("the hours already gone never set the temperature", () => {
  // `restOfDay` only ever contains hours still ahead, so an app opened at 20:00
  // plans against 20:00 onward — the mirror of the bug that dressed the user
  // for a peak they had already lived through.
  const evening = from(20, [12, 10, 9]);
  expect(planningTempFor("everyday", evening, 12)).toBe(12);
  expect(planningTempFor("evening", evening, 12)).toBe(12);
});

test("an occasion whose window has passed falls back to the hours that remain", () => {
  // Work asked for at 21:00. Dressing for a working day that is over would be
  // absurd; dressing for the rest of tonight is the only useful answer.
  const lateNight = from(21, [9, 8, 7]);
  expect(planningTempFor("work", lateNight, 9)).toBe(9);
});

test("no hours at all falls back to the current reading", () => {
  expect(planningTempFor("work", [], 17)).toBe(17);
});

test("the windows are ordered as the day is", () => {
  expect(occasionWindow("work")[1]).toBeLessThanOrEqual(occasionWindow("everyday")[1]);
  expect(occasionWindow("evening")[0]).toBeGreaterThanOrEqual(occasionWindow("work")[1] - 1);
});

test("the warmest hour wins, not the average", () => {
  // Over-dressed at the peak is the failure users feel; the cool end is
  // laterAdvice's job. A mean would split the difference and satisfy neither.
  const spiky = from(12, [10, 10, 28, 10, 10]);
  expect(planningTempFor("everyday", spiky, 10)).toBe(28);
});
