"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import { LanguageSheet } from "./language-sheet";

export function LanguageButton() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // React Activity cleans up effects when hiding a route; close before it can be restored.
  useEffect(() => () => setOpen(false), [pathname]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        className="inline-flex min-h-[44px] items-center gap-2 text-[14px] text-muted-foreground">
        <Globe size={14} aria-hidden="true" />
        <span lang={locale}>{LOCALE_NAMES[locale]}</span>
      </button>
      {open && <LanguageSheet open current={locale} onClose={close} />}
    </>
  );
}
