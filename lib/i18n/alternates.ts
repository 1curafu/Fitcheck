import type { Metadata } from "next";
import { SITE_URL, PUBLIC_PATHS } from "@/lib/site";
import { localizedPath, SHIPPED_LOCALES, type ShippedLocale } from "./locales";

export function alternatesFor(path: (typeof PUBLIC_PATHS)[number], locale: ShippedLocale): Metadata["alternates"] {
  const url = (language: ShippedLocale) => `${SITE_URL}${localizedPath(language, path)}`;
  return {
    canonical: url(locale),
    languages: { ...Object.fromEntries(SHIPPED_LOCALES.map(language => [language, url(language)])), "x-default": url("en-US") },
  };
}
