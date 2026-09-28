"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALE_NAMES, SHIPPED_LOCALES, type ShippedLocale } from "@/lib/i18n/locales";

export function LanguageSheet({ open, current, onClose }: { open: boolean; current: ShippedLocale; onClose: () => void }) {
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleId = useId();
  const currentButton = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    currentButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, pending, onClose]);

  if (!open) return null;
  return (
    <>
      <button type="button" aria-label={t("close")} disabled={pending} onClick={onClose}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]" />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5">
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />
        <h2 id={titleId} className="mb-4 font-serif text-[24px]/[1.15] text-foreground">{t("title")}</h2>
        <div className="flex flex-col">
          {SHIPPED_LOCALES.map((locale) => (
            <button key={locale} ref={locale === current ? currentButton : undefined} type="button"
              aria-current={locale === current ? "true" : undefined} disabled={pending}
              onClick={() => startTransition(async () => {
                setError(false);
                try {
                  await setLocale(locale);
                  router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale });
                  onClose();
                } catch { setError(true); }
              })}
              className="flex min-h-[52px] items-center justify-between border-b border-[var(--hairline-2)] text-left text-[15px] text-foreground last:border-b-0 disabled:opacity-60">
              <span lang={locale}>{LOCALE_NAMES[locale]}</span>
              {locale === current && <span aria-hidden="true" className="text-muted-foreground">✓</span>}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] text-muted-foreground">{t("saveFailed")}</p>}
      </div>
    </>
  );
}
