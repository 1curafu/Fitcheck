export type Interval = "month" | "year";
export type DisplayCurrency = "CHF" | "EUR" | "USD";

/** Dashboard lookup keys (live + sandbox). Renaming one here breaks checkout. */
export const LOOKUP_KEYS: Record<Interval, string> = { month: "pro_monthly", year: "pro_annual" };

/** Mirrors the Dashboard's manual currency options (tax-inclusive). Verified by scripts/stripe-verify-prices.ts. */
export const DISPLAY_AMOUNTS: Record<Interval, Record<DisplayCurrency, number>> = {
  month: { CHF: 5, EUR: 5, USD: 5 },
  year: { CHF: 50, EUR: 50, USD: 50 },
};

const CHF_ZONES = new Set(["Europe/Zurich", "Europe/Vaduz", "Europe/Busingen"]);
const EUR_ZONES = new Set([
  "Europe/Vienna", "Europe/Brussels", "Europe/Nicosia", "Asia/Nicosia", "Asia/Famagusta", "Europe/Zagreb",
  "Europe/Tallinn", "Europe/Helsinki", "Europe/Paris", "Europe/Berlin", "Europe/Athens", "Europe/Dublin",
  "Europe/Rome", "Europe/Riga", "Europe/Vilnius", "Europe/Luxembourg", "Europe/Malta", "Europe/Amsterdam",
  "Europe/Lisbon", "Atlantic/Madeira", "Atlantic/Azores", "Europe/Bratislava", "Europe/Ljubljana", "Europe/Madrid",
  "Atlantic/Canary", "Africa/Ceuta", "Europe/Monaco", "Europe/San_Marino", "Europe/Vatican", "Europe/Andorra",
]);
const US_ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix",
  "America/Anchorage", "America/Detroit", "America/Boise", "America/Juneau", "America/Sitka", "America/Nome",
  "America/Adak", "America/Menominee", "America/Metlakatla", "America/Yakutat", "Pacific/Honolulu",
];
const US_PREFIXES = ["America/Indiana/", "America/Kentucky/", "America/North_Dakota/"];

/** Display only — Stripe Checkout (Adaptive Pricing) decides the real currency. */
export function currencyForTimeZone(tz: string | undefined): { currency: DisplayCurrency; converted: boolean } {
  if (tz && CHF_ZONES.has(tz)) return { currency: "CHF", converted: false };
  if (tz && EUR_ZONES.has(tz)) return { currency: "EUR", converted: false };
  if (tz && (US_ZONES.includes(tz) || US_PREFIXES.some((p) => tz.startsWith(p)))) {
    return { currency: "USD", converted: false };
  }
  return { currency: "CHF", converted: true };
}

const FORMAT_TEXT: Record<DisplayCurrency, (amount: string) => string> = {
  CHF: (a) => `CHF ${a}`,
  EUR: (a) => `€${a}`,
  USD: (a) => `$${a}`,
};

export function displayPrice(interval: Interval, tz: string | undefined): { label: string; converted: boolean } {
  const { currency, converted } = currencyForTimeZone(tz);
  return { label: `${FORMAT_TEXT[currency](String(DISPLAY_AMOUNTS[interval][currency]))} / ${interval}`, converted };
}

/** The annual plan's per-month cost, as a hint under it ("CHF 4.17 / month"). Display only. */
export function monthlyEquivalent(tz: string | undefined): string {
  const { currency } = currencyForTimeZone(tz);
  const perMonth = (DISPLAY_AMOUNTS.year[currency] / 12).toFixed(2);
  return `${FORMAT_TEXT[currency](perMonth)} / month`;
}
