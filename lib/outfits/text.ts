import type { Locale, ShippedLocale } from "@/lib/i18n/locales";

/** Immutable original prose, separate from its current display translation. */
export type OutfitTextSource = { id: string; sourceLocale: Locale; name: string; why: string | null };
export type OutfitText = {
  id: string; locale: ShippedLocale; name: string; why: string | null;
  translated: boolean; source: OutfitTextSource;
};
export type TranslationRow = {
  outfit_id: string; target_locale: Locale; source_locale: Locale; source_name: string; source_why: string | null;
  name: string | null; why: string | null; status: "pending" | "ready" | "failed";
};
export type TranslationResult = { locale: ShippedLocale; texts: OutfitText[]; busyIds: string[] };
export type TranslationClaim = { source: OutfitTextSource; targetLocale: ShippedLocale; leaseToken: string };
export type TranslationCompletion =
  | { outfitId: string; leaseToken: string; status: "ready"; name: string; why: string | null }
  | { outfitId: string; leaseToken: string; status: "failed" };
