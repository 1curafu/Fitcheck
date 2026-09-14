"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/**
 * A notice, not a consent dialog — and that is a fact about the app, not a
 * shortcut. Fitcheck sets only the cookies that keep you signed in; page views
 * are counted without cookies; there is no tracking. Strictly necessary
 * cookies need no consent under the ePrivacy rules, so the honest UI is one
 * line that says so, with a link to the policy, dismissed once.
 *
 * ⚠️ If a consent-requiring tool is ever added — a tracking pixel, replay,
 * anything advertising — this becomes a real consent manager, and the privacy
 * policy's cookie section changes with it.
 *
 * Same external-store shape as the what's-new card: read from localStorage
 * through useSyncExternalStore, never an effect that sets state.
 */
const KEY = "fitcheck:cookie-notice";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "seen";
  } catch {
    // Storage unavailable: treat as seen, or the bar returns on every load.
    return true;
  }
}
function dismiss() {
  try {
    window.localStorage.setItem(KEY, "seen");
  } catch {
    // Nothing to do.
  }
  for (const n of listeners) n();
}
function subscribe(n: () => void) {
  listeners.add(n);
  return () => void listeners.delete(n);
}

export function CookieNotice() {
  // The server has no storage and answers "seen", so the bar appears on
  // hydration only for a browser that has not dismissed it.
  const seen = useSyncExternalStore(subscribe, read, () => true);
  if (seen) return null;

  return (
    // ⚠️ TOP, not bottom. Every important control in this app lives at the
    // bottom — the nav, the capture button, Wear, Style — and a bottom bar sat
    // on top of all of them until dismissed. The top has only a screen title
    // beneath it, and only until OK.
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 top-0 z-[90] mx-auto max-w-[440px] px-4 pt-[calc(env(safe-area-inset-top)+10px)]"
    >
      <div className="surface-card flex items-center gap-3 rounded-[14px] px-4 py-3">
        <p className="flex-1 text-[12.5px] leading-[1.45] text-muted-foreground">
          Only the cookies that keep you signed in. No tracking.{" "}
          <Link href="/privacy" className="text-foreground underline underline-offset-2">
            How we handle your data
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-semibold text-canvas bg-foreground"
        >
          OK
        </button>
      </div>
    </div>
  );
}
