"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALE_NAMES, SHIPPED_LOCALES, type ShippedLocale } from "@/lib/i18n/locales";

/** About five rows; the rest of the ten languages scroll inside the menu. */
export const MENU_MAX_HEIGHT = 272;

/** A small dropdown anchored to its trigger (the trigger's wrapper is `relative`); it opens up or down. */
export function LanguageSheet({ open, current, placement = "down", align = "start", onClose }: {
  open: boolean; current: ShippedLocale; placement?: "up" | "down"; align?: "start" | "center" | "end"; onClose: () => void;
}) {
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentButton = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    // Focusing also scrolls the current language into view inside the menu.
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
        className="fixed inset-0 z-[60] cursor-default bg-transparent" />
      <div role="dialog" aria-label={t("title")} style={{ maxHeight: `min(${MENU_MAX_HEIGHT}px, 60dvh)` }}
        className={`absolute z-[70] w-[216px] ${align === "center" ? "left-1/2 -translate-x-1/2" : align === "end" ? "right-0" : "left-0"} overflow-y-auto overscroll-contain rounded-[14px] border border-[rgba(237,230,216,0.12)] bg-surface-2 px-4 py-1 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)] ${placement === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}>
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
              className="flex min-h-[44px] items-center justify-between border-b border-[var(--hairline-2)] text-left text-[15px] text-foreground last:border-b-0 disabled:opacity-60">
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
