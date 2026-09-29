export const LOCALES = ["en-US", "en-GB", "uk", "ru", "de", "fr", "it", "pt", "es", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
/** Every locale is routed since Plan 3. The alias remains because routing, preferences and actions speak of "shipped". */
export const SHIPPED_LOCALES = LOCALES;
export type ShippedLocale = Locale;
export const DEFAULT_LOCALE = "en-US" satisfies ShippedLocale;

export const LOCALE_NAMES: Record<Locale, string> = {
  "en-US": "English (US)", "en-GB": "English (UK)", uk: "Українська", ru: "Русский", de: "Deutsch",
  fr: "Français", it: "Italiano", pt: "Português", es: "Español", nl: "Nederlands",
};

const PREFIX: Record<ShippedLocale, string> = {
  "en-US": "", "en-GB": "/en-gb", uk: "/uk", ru: "/ru", de: "/de", fr: "/fr", it: "/it", pt: "/pt", es: "/es", nl: "/nl",
};
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
