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

import { dayMonth } from "../format";
import type { Locale } from "../locales";

const sep28 = new Date("2026-09-28T00:00:00Z");
it.each([
  ["en-US", "Sep 28"], ["en-GB", "28 Sep"], ["uk", "28 вер"], ["ru", "28 сен"], ["de", "28. Sep"],
  ["fr", "28 sept"], ["it", "28 set"], ["pt", "28 set"], ["es", "28 sept"], ["nl", "28 sep"],
] as [Locale, string][])("%s short date is pinned", (locale, expected) => {
  expect(formatShortDate(sep28, locale)).toBe(expected);
});
it.each([
  ["de", "3.–7. Okt", "29. Sep – 2. Okt"], ["ru", "3–7 окт", "29 сен – 2 окт"], ["fr", "3–7 oct", "29 sept – 2 oct"],
  ["it", "3–7 ott", "29 set – 2 ott"], ["pt", "3–7 out", "29 set – 2 out"], ["es", "3–7 oct", "29 sept – 2 oct"],
  ["nl", "3–7 okt", "29 sep – 2 okt"], ["en-US", "Oct 3–7", "Sep 29 – Oct 2"], ["en-GB", "3–7 Oct", "29 Sep – 2 Oct"],
] as [Locale, string, string][])("%s trip ranges are pinned", (locale, sameMonth, crossMonth) => {
  expect(formatDateRange("2026-10-03", "2026-10-07", locale)).toBe(sameMonth);
  expect(formatDateRange("2026-09-29", "2026-10-02", locale)).toBe(crossMonth);
});
it("maps every locale to a regional Intl code and only en-US starts weeks on Sunday", () => {
  expect((["ru", "de", "fr", "it", "pt", "es", "nl"] as Locale[]).map(l => intlLocale(l)))
    .toEqual(["ru-RU", "de-DE", "fr-FR", "it-IT", "pt-PT", "es-ES", "nl-NL"]);
  for (const l of ["ru", "de", "fr", "it", "pt", "es", "nl"] as Locale[]) expect(weekStartsOn(l)).toBe(1);
});
it("German day-month uses the ordinal dot", () => expect(dayMonth(3, "Okt", "de")).toBe("3. Okt"));
it("money uses the reader's punctuation in the new languages", () => {
  expect(formatMoney(5, "de")).toMatch(/^5,00\s€$/u);
  expect(formatMoney(5, "nl")).toMatch(/^€\s5,00$/u);
});
it("share kicker day-month follows the sharer's language", () => {
  expect(shareKicker("Work", "2026-09-28", "de")).toBe("Work · 28. Sep");
  expect(shareKicker("Work", "2026-09-28", "fr")).toBe("Work · 28 sept");
});
