import { intlLocale } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locales";

const money = new Map<Locale, Intl.NumberFormat>();

/** Prices stay in EUR; punctuation and placement follow the reader's locale. */
export function formatMoney(amount: number, locale: Locale = "en-US"): string {
  let formatter = money.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol" });
    money.set(locale, formatter);
  }
  return formatter.format(amount);
}
