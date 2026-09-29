import type { Locale } from "../locales";

/** Locales whose catalogue, legal pages, release history and email text are complete.
 *  Each Plan 3 locale task appends its code; routing ships exactly this list. */
export const CONTENT_LOCALES = ["en-US", "en-GB", "uk", "de", "ru", "fr", "it", "pt", "es"] as const satisfies readonly Locale[];
