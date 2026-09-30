"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import { LanguageSheet, MENU_MAX_HEIGHT } from "./language-sheet";

/** `align="center"` for a centered trigger, `"end"` for a trigger at the right edge (landing/sign-in top bar); Settings' left-aligned row keeps the menu on its start edge. */
export function LanguageButton({ align = "start" }: { align?: "start" | "center" | "end" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const anchor = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<"up" | "down" | null>(null);
  const close = useCallback(() => setPlacement(null), []);
  // React Activity cleans up effects when hiding a route; close before it can be restored.
  useEffect(() => () => setPlacement(null), [pathname]);

  // Open toward the side with room: the landing button sits at the bottom, the Settings row mid-page.
  const open = () => {
    const rect = anchor.current?.getBoundingClientRect();
    const below = rect ? window.innerHeight - rect.bottom : Infinity;
    setPlacement(below >= MENU_MAX_HEIGHT + 16 || (rect && below >= rect.top) ? "down" : "up");
  };

  return (
    <span ref={anchor} className="relative inline-block">
      <button type="button" onClick={open} aria-haspopup="dialog" aria-expanded={placement !== null}
        className="inline-flex min-h-[44px] items-center gap-2 text-[14px] text-muted-foreground">
        <Globe size={14} aria-hidden="true" />
        <span lang={locale}>{LOCALE_NAMES[locale]}</span>
      </button>
      {placement && <LanguageSheet open current={locale} placement={placement} align={align} onClose={close} />}
    </span>
  );
}
