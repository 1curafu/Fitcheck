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
    <nav className="sticky bottom-0 z-50 flex border-t border-[--border] bg-canvas/90 px-2 py-2 backdrop-blur">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-1 text-[11px]",
              active ? "text-brand" : "text-muted-foreground",
            )}
          >
            <Icon size={20} strokeWidth={1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
