"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, Sparkles, CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Prototype's bottom nav: Closet · Stylist · Diary · Profile.
// Style DNA / Saved Outfits / Stats / Settings live under Profile (not tabs).
const TABS = [
  { href: "/closet", label: "Closet", Icon: Shirt },
  { href: "/generate", label: "Stylist", Icon: Sparkles },
  { href: "/calendar", label: "Diary", Icon: CalendarDays },
  { href: "/profile", label: "Profile", Icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    // Design :825-826 — a floating PILL, not a full-width bar. The outer
    // element is only a gradient fade to the canvas; the pill is the inner slab,
    // inset from the screen edges and lifted clear of the home indicator.
    // ADDITIVE, not `max(26px, …)`. The gap below the pill exists to clear the
    // home indicator, which only exists in the installed PWA — a floor of 26px
    // meant 26px of measured dead space in a browser tab, where the toolbar
    // already occupies that band and `env(safe-area-inset-bottom)` is 0.
    // Now: 12px in the browser, 46px on an iPhone in standalone (34 + 12), so
    // the pill sits just clear of the indicator either way. `viewportFit:
    // "cover"` in app/layout.tsx is what makes the variable resolve at all.
    <nav className="sticky bottom-0 z-50 bg-gradient-to-t from-canvas from-72% to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[10px]">
      <div className="flex items-center justify-around rounded-[22px] bg-[rgba(24,23,26,0.82)] px-2 py-[11px] shadow-[inset_0_0_0_1px_var(--hairline-5),0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-[18px] backdrop-saturate-150">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                // text-[11px] is retained deliberately: the design specifies
                // 9.5px here, but this plan must not touch font sizes — the
                // small-type question is deferred to the end of the project
                // (decision 2026-07-24) and belongs to its own audit.
                "flex flex-1 flex-col items-center gap-[5px] py-[2px] text-[11px] tracking-[0.06em]",
                // :1145 — tabActive '#EDE6D8' at weight 600, tabIdle '#5b5950'.
                // Idle maps to --muted-dim (#615c52), the nearest system token;
                // the design's exact value is 6/3/2 darker per channel, which is
                // imperceptible and not worth a one-off hex.
                // Deliberately NOT rust: the active tab used to be text-brand,
                // which spent a second rust on every screen. See DESIGN.md, the
                // One Rust Rule.
                active ? "font-semibold text-foreground" : "text-muted-dim",
              )}
            >
              <Icon size={23} strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
