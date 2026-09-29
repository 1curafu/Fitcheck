"use client";

import { usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The public landing is a desktop page; everything else lives in the 440px phone column.
 *
 * ⚠️ Decided from the CURRENT pathname, not from the landing's presence in the DOM. React Activity keeps a visited
 * route mounted (hidden) after navigation, so a `:has(.landing)` rule would keep /sign-in and the app wide.
 */
export function isWidePath(pathname: string): boolean {
  return pathname === "/";
}

export function ShellFrame({ children }: { children: React.ReactNode }) {
  const wide = isWidePath(usePathname());
  return (
    <div className={cn("relative mx-auto flex min-h-dvh w-full flex-col overflow-x-clip bg-canvas", wide ? "max-w-none" : "max-w-[440px]")}>
      {children}
    </div>
  );
}
