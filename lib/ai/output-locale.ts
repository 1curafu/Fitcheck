import type { Locale } from "@/lib/i18n/locales";

const OUTPUT_LANGUAGE: Record<Locale, string> = {
  "en-US": "American English", "en-GB": "British English", uk: "Ukrainian", ru: "Russian",
  de: "German", fr: "French", it: "Italian", pt: "European Portuguese", es: "Spanish", nl: "Dutch",
};

export function outputLanguage(locale: Locale): string {
  return OUTPUT_LANGUAGE[locale];
}
