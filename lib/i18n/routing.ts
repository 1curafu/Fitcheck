import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, SHIPPED_LOCALES } from "./locales";

export const routing = defineRouting({
  locales: SHIPPED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: { mode: "as-needed", prefixes: { "en-GB": "/en-gb", uk: "/uk" } },
  localeCookie: { name: "NEXT_LOCALE", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
  localeDetection: true,
  alternateLinks: false, // hreflang is emitted in metadata for public pages only (Task 19)
});
