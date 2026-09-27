export const LOCALES = ["en-US", "en-GB", "uk", "ru", "de", "fr", "it", "pt", "es", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
/** Routed today. Plan 3 appends the other seven once their messages exist. */
export const SHIPPED_LOCALES = ["en-US", "en-GB", "uk"] as const satisfies readonly Locale[];
export type ShippedLocale = (typeof SHIPPED_LOCALES)[number];
export const DEFAULT_LOCALE = "en-US" satisfies ShippedLocale;

export const LOCALE_NAMES: Record<Locale, string> = {
  "en-US": "English (US)", "en-GB": "English (UK)", uk: "Українська", ru: "Русский", de: "Deutsch",
  fr: "Français", it: "Italiano", pt: "Português", es: "Español", nl: "Nederlands",
};

const PREFIX: Record<ShippedLocale, string> = { "en-US": "", "en-GB": "/en-gb", uk: "/uk" };
export const LOCALE_PREFIXES = PREFIX;

export function isShippedLocale(v: unknown): v is ShippedLocale {
  return typeof v === "string" && (SHIPPED_LOCALES as readonly string[]).includes(v);
}

/** "/closet" in `uk` → "/uk/closet". `path` is an app path starting with "/"; a query string is kept. */
export function localizedPath(locale: ShippedLocale, path: string): string {
  const prefix = PREFIX[locale];
  if (!prefix) return path;
  return path === "/" ? prefix : path.startsWith("/?") ? `${prefix}${path.slice(1)}` : `${prefix}${path}`;
}
