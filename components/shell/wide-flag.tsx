"use client";

import { usePathname } from "@/lib/i18n/navigation";

/**
 * The public landing is a desktop page; everything else lives in the 440px phone column.
 *
 * ⚠️ Decided from the CURRENT pathname, not from the landing's presence in the DOM. React Activity keeps a visited
 * route mounted (hidden) after navigation, so a `:has(.landing)` rule would keep /sign-in and the app wide.
 */
export function isWidePath(pathname: string): boolean {
  return pathname === "/";
}

/**
 * Lifts the phone column's cap by overriding `--shell-max` while the URL is the landing.
 *
 * ⚠️ Rendered inside its own `<Suspense fallback={null}>` by `MobileShell`. Reading the URL is request-time data
 * on dynamic routes (`/l/[token]`), and Next fails the build when a Client Component reads it outside a boundary.
 * On static routes such as `/` it resolves during prerender, so the landing's first paint is already wide; on a
 * dynamic route it simply stays suspended and the column keeps its 440px default.
 */
export function WideFlag() {
  return isWidePath(usePathname()) ? <style>{":root{--shell-max:none}"}</style> : null;
}
