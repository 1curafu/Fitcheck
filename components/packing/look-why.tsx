"use client";
import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { LookTextRequest } from "@/components/i18n/look-text-request";
import { WhyQuote } from "@/components/generate/why-quote";
import { displayOutfitText, type OutfitText, type TranslationResult } from "@/lib/outfits/text";

/** Capsule and shortfall display the same first saved day's reasoning. */
export function LookWhy({ name, text, fallbackWhy }: { name: string; text: OutfitText | null; fallbackWhy: string }) {
  const locale = useLocale();
  const [result, setResult] = useState<TranslationResult | null>(null);
  const onReady = useCallback((next: TranslationResult) => { if (next.locale === locale) setResult(next); }, [locale]);
  const selected = text ? displayOutfitText(text, locale, result) : null;
  return <>
    <LookTextRequest locale={locale} sources={selected && selected.source.why?.trim() && !selected.translated ? [selected.source] : []} onReady={onReady} />
    <WhyQuote name={name} why={selected?.why ?? fallbackWhy} />
  </>;
}
