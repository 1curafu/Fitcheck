import { localDateFor, localHourFor } from "../local-date";

// "Today" must be the user's local date. Keying the daily set on the UTC date
// rolls the drop over at the wrong hour for everyone outside UTC — 01:30 in
// Berlin is still "yesterday" by UTC, so the user would get a second set of
// looks in the middle of the night.
const lateEvening = new Date("2026-07-22T23:30:00Z");

test("formats as YYYY-MM-DD", () => {
  expect(localDateFor(lateEvening, "UTC")).toBe("2026-07-22");
});
test("an instant that is already tomorrow in the user's zone reads as tomorrow", () => {
  expect(localDateFor(lateEvening, "Europe/Berlin")).toBe("2026-07-23");
});
test("the same instant is still today in a western zone", () => {
  expect(localDateFor(lateEvening, "America/New_York")).toBe("2026-07-22");
});
test("an unknown zone falls back to UTC instead of throwing", () => {
  expect(localDateFor(lateEvening, "Not/AZone")).toBe("2026-07-22");
});

test("localHourFor reads the hour in the user's zone, not UTC", () => {
  const t = new Date("2026-08-13T20:00:00Z");
  expect(localHourFor(t, "UTC")).toBe(20);
  expect(localHourFor(t, "Asia/Tokyo")).toBe(5); // next morning
  expect(localHourFor(t, "America/Los_Angeles")).toBe(13); // still afternoon
});

test("midnight is 0, never 24", () => {
  // Some locales default to h24 and render midnight as "24", which would never
  // compare below the evening threshold — the confirmation would ask at 00:00.
  expect(localHourFor(new Date("2026-08-13T00:00:00Z"), "UTC")).toBe(0);
});

test("an unknown zone falls back rather than throwing", () => {
  expect(localHourFor(new Date("2026-08-13T20:00:00Z"), "Not/AZone")).toBe(20);
});
