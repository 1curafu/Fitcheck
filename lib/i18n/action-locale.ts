import "server-only";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, isShippedLocale, type ShippedLocale } from "./locales";

/** Actions have no root params. The locale proxy sets this header from the route's URL.
 *  It chooses display language only; authentication and ownership are checked independently. */
export async function getActionLocale(): Promise<ShippedLocale> {
  const locale = (await headers()).get("X-NEXT-INTL-LOCALE");
  return isShippedLocale(locale) ? locale : DEFAULT_LOCALE;
}
