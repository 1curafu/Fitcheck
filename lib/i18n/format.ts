import type { Locale } from "./locales";

const INTL: Record<Locale, string> = {
  "en-US": "en-US", "en-GB": "en-GB", uk: "uk-UA", ru: "ru-RU", de: "de-DE",
  fr: "fr-FR", it: "it-IT", pt: "pt-PT", es: "es-ES", nl: "nl-NL",
};

export const intlLocale = (locale: Locale): string => INTL[locale];
export const weekStartsOn = (locale: Locale): 0 | 1 => locale === "en-US" ? 0 : 1;

/** Fixed card months avoid Node/Safari differences such as Sept versus Sep. Genitive where the language needs it (ru). */
export const SHORT_MONTHS: Record<Locale, readonly string[]> = {
  "en-US": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  "en-GB": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  uk: ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"],
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  fr: ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"],
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
  nl: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
};

/** "Sep 28" in en-US, "28. Sep" in German, "28 sept" elsewhere. */
export function dayMonth(day: number, month: string, locale: Locale): string {
  if (locale === "en-US") return `${month} ${day}`;
  if (locale === "de") return `${day}. ${month}`;
  return `${day} ${month}`;
}

/** Trip dates are local date keys, so parse their components without a timezone conversion. */
export function formatDateRange(start: string, end: string, locale: Locale): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const a = SHORT_MONTHS[locale][startMonth - 1];
  const b = SHORT_MONTHS[locale][endMonth - 1];
  if (startYear === endYear && startMonth === endMonth) {
    if (locale === "en-US") return `${b} ${startDay}–${endDay}`;
    if (locale === "de") return `${startDay}.–${endDay}. ${b}`;
    return `${startDay}–${endDay} ${b}`;
  }
  return `${dayMonth(startDay, a, locale)} – ${dayMonth(endDay, b, locale)}`;
}

/** Stable short date for UI rendered on both server and client. */
export function formatShortDate(date: Date, locale: Locale, includeYear = false): string {
  const label = dayMonth(date.getUTCDate(), SHORT_MONTHS[locale][date.getUTCMonth()], locale);
  return includeYear ? `${label} ${date.getUTCFullYear()}` : label;
}
