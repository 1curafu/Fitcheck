import type { ShippedLocale } from "./locales";

const INTL: Record<ShippedLocale, string> = { "en-US": "en-US", "en-GB": "en-GB", uk: "uk-UA" };

export const intlLocale = (locale: ShippedLocale): string => INTL[locale];
export const weekStartsOn = (locale: ShippedLocale): 0 | 1 => locale === "en-US" ? 0 : 1;

/** Fixed card months avoid Node/Safari differences such as Sept versus Sep. */
export const SHORT_MONTHS: Record<ShippedLocale, readonly string[]> = {
  "en-US": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "en-GB": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  uk: ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"],
};

/** Trip dates are local date keys, so parse their components without a timezone conversion. */
export function formatDateRange(start: string, end: string, locale: ShippedLocale): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const a = SHORT_MONTHS[locale][startMonth - 1];
  const b = SHORT_MONTHS[locale][endMonth - 1];
  if (startYear === endYear && startMonth === endMonth) {
    return locale === "en-US" ? `${b} ${startDay}–${endDay}` : `${startDay}–${endDay} ${b}`;
  }
  return locale === "en-US"
    ? `${a} ${startDay} – ${b} ${endDay}`
    : `${startDay} ${a} – ${endDay} ${b}`;
}

/** Stable short date for UI rendered on both server and client. */
export function formatShortDate(date: Date, locale: ShippedLocale, includeYear = false): string {
  const month = SHORT_MONTHS[locale][date.getUTCMonth()];
  const day = date.getUTCDate();
  const label = locale === "en-US" ? `${month} ${day}` : `${day} ${month}`;
  return includeYear ? `${label} ${date.getUTCFullYear()}` : label;
}
