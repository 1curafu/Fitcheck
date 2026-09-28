import { isShippedLocale, type ShippedLocale } from "./locales";
import { mergePreferencesForSave } from "@/lib/profile/preferences";

export const PENDING_LOCALE_COOKIE = "FITCHECK_PENDING_LOCALE";

export function pendingLocaleForUser(raw: string | undefined, userId: string): ShippedLocale | undefined {
  if (!raw) return undefined;
  const parts = raw.split(":");
  return parts.length === 2 && parts[0] === userId && isShippedLocale(parts[1]) ? parts[1] : undefined;
}

export function withLocale(raw: unknown, locale: ShippedLocale): Record<string, unknown> {
  const bag = mergePreferencesForSave(raw, { locale });
  if (!("tempUnit" in bag)) bag.tempUnit = locale === "en-US" ? "F" : "C";
  return bag;
}
