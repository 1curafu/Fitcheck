import { DEFAULT_LOCALE, isShippedLocale, type ShippedLocale } from "./locales";

/** Pending is trusted only after its cookie has been bound to the authenticated account. */
export function resolveSignInLocale(saved: unknown, browsing: string | undefined, pending?: ShippedLocale): { locale: ShippedLocale; save: boolean } {
  if (pending) return { locale: pending, save: true };
  if (isShippedLocale(saved)) return { locale: saved, save: false };
  return { locale: isShippedLocale(browsing) ? browsing : DEFAULT_LOCALE, save: true };
}
