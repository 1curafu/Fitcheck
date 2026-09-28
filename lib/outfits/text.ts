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

/** A cached translation is valid only for exactly these original words. */
export function selectOutfitText(source: OutfitTextSource, target: ShippedLocale, cache?: TranslationRow): OutfitText {
  const valid = source.sourceLocale !== target && cache?.status === "ready" &&
    cache.outfit_id === source.id && cache.target_locale === target &&
    cache.source_locale === source.sourceLocale && cache.source_name === source.name &&
    cache.source_why === source.why && typeof cache.name === "string" && cache.name.trim().length > 0 &&
    cache.name.length <= 40 && (cache.why === null) === (source.why === null) &&
    (cache.why === null || cache.why.length <= 1000);
  return { id: source.id, locale: target, name: valid ? cache.name! : source.name,
    why: valid ? cache.why : source.why, translated: !!valid, source };
}

export function validatedUniqueIds(raw: unknown): string[] {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 6 || raw.some(id => typeof id !== "string" || !uuid.test(id))) {
    throw new Error("Invalid outfit IDs");
  }
  return [...new Set(raw as string[])];
}

export function sameOutfitTextSource(a: OutfitTextSource, b: OutfitTextSource): boolean {
  return a.id === b.id && a.sourceLocale === b.sourceLocale && a.name === b.name && a.why === b.why;
}

/** A replacement row or locale switch invalidates an older display result. */
export function displayOutfitText(text: OutfitText, locale: ShippedLocale, result?: TranslationResult | null): OutfitText {
  const base = text.locale === locale ? text : selectOutfitText(text.source, locale);
  if (result?.locale !== locale) return base;
  return result.texts.find(candidate => candidate.translated && candidate.locale === locale && candidate.id === text.id &&
    sameOutfitTextSource(candidate.source, text.source)) ?? base;
}

export function applyOutfitTexts(looks: import("@/lib/generator/types").Look[], result: TranslationResult, activeLocale: ShippedLocale): import("@/lib/generator/types").Look[] {
  if (result.locale !== activeLocale) return looks;
  return looks.map(look => {
    const text = result.texts.find(row => row.id === look.id && row.locale === activeLocale && sameOutfitTextSource(row.source,look.textSource));
    return text ? { ...look, name: text.name, why: text.why ?? "", textLocale: activeLocale, textTranslated: text.translated } : look;
  });
}
