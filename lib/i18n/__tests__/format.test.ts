import { expect, it } from "vitest";
import { SHORT_MONTHS, formatDateRange, formatShortDate, intlLocale, weekStartsOn } from "../format";
import { formatMoney } from "@/lib/format/money";
import { shareKicker } from "@/lib/share/snapshot";

it("starts weeks on Sunday only in the US", () => {
  expect(weekStartsOn("en-US")).toBe(0);
  expect(weekStartsOn("en-GB")).toBe(1);
  expect(weekStartsOn("uk")).toBe(1);
});

it("keeps euro while following the reader's conventions", () => {
  expect(formatMoney(50, "en-GB")).toBe("€50.00");
  expect(formatMoney(50, "uk")).toMatch(/^50,00\s€$/);
});

it("uses fixed card month strings and the locale's day order", () => {
  for (const locale of ["en-US", "en-GB", "uk"] as const) expect(SHORT_MONTHS[locale]).toHaveLength(12);
  expect(shareKicker("Робота", "2026-09-27", "uk")).toBe("Робота · 27 вер");
  expect(shareKicker("Work", "2026-09-27", "en-US")).toBe("Work · Sep 27");
  expect(shareKicker("Work", "2026-09-27", "en-GB")).toBe("Work · 27 Sep");
  expect(intlLocale("uk")).toBe("uk-UA");
});

it("formats trip and status dates in the reader's order", () => {
  expect(formatDateRange("2026-09-27", "2026-09-30", "en-US")).toBe("Sep 27–30");
  expect(formatDateRange("2026-09-27", "2026-09-30", "uk")).toBe("27–30 вер");
  expect(formatShortDate(new Date("2026-10-12T23:30:00Z"), "en-US", true)).toBe("Oct 12 2026");
  expect(formatShortDate(new Date("2026-10-12T23:30:00Z"), "uk", true)).toBe("12 жов 2026");
});
