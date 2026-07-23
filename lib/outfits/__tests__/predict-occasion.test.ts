import { predictOccasion, defaultReason } from "../predict-occasion";

// 2026-07-22 is a Wednesday, 2026-07-25 a Saturday.
const wednesday = new Date("2026-07-22T09:00:00Z");
const saturday = new Date("2026-07-25T09:00:00Z");
const ALL = ["Work", "Everyday", "Weekend", "Evening"];

test("a weekday defaults to Work when the user dresses for work", () => {
  expect(predictOccasion(wednesday, "UTC", ALL)).toBe("work");
});
test("a weekday falls back to Everyday when the user does NOT dress for work", () => {
  expect(predictOccasion(wednesday, "UTC", ["Everyday", "Weekend"])).toBe("everyday");
});
test("a weekend defaults to Weekend when the user dresses for it", () => {
  expect(predictOccasion(saturday, "UTC", ALL)).toBe("weekend");
});
test("a weekend falls back to Everyday when the user does not dress for the weekend", () => {
  expect(predictOccasion(saturday, "UTC", ["Work", "Everyday"])).toBe("everyday");
});

// The prediction is a soft default — it must degrade, never throw.
test("empty occasions default to everyday (today's behavior, no regression)", () => {
  expect(predictOccasion(wednesday, "UTC", [])).toBe("everyday");
});
test("never returns an occasion the user did not select", () => {
  // dresses only for Evening — a weekday can't produce Work/Everyday/Weekend
  expect(predictOccasion(wednesday, "UTC", ["Evening"])).toBe("evening");
});

// Day-of-week is LOCAL. 2026-07-25T00:30Z is still Friday in New York but already
// Saturday in Berlin — the default must follow the user's zone.
test("timezone decides which day it is", () => {
  const lateFriUtc = new Date("2026-07-25T00:30:00Z");
  expect(predictOccasion(lateFriUtc, "America/New_York", ALL)).toBe("work"); // still Fri
  expect(predictOccasion(lateFriUtc, "Europe/Berlin", ALL)).toBe("weekend"); // already Sat
});

test("each occasion has its own legible reason", () => {
  expect(defaultReason("work")).toMatch(/work/i);
  expect(defaultReason("weekend")).toMatch(/weekend/i);
  expect(defaultReason("everyday")).toBeTruthy();
  expect(defaultReason("evening")).toBeTruthy();
});
