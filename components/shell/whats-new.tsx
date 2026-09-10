"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CURRENT_RELEASE } from "@/lib/release-notes";
import { WhatsNewCard } from "./whats-new-card";

/**
 * "Here's what changed" — shown once per release, to people who were already here.
 *
 * ⚠️ Mounted on the CLOSET rather than in `MobileShell`, for the reason the wear
 * confirmation avoids the shell: there it would appear mid-capture and mid-edit,
 * where an interruption costs most. The closet is where the app opens and the
 * least disruptive place to be told something changed.
 *
 * ⚠️ Read through `useSyncExternalStore`, not an effect that calls setState.
 * That is what localStorage IS — an external system React does not control — and
 * the first draft's `useEffect(() => setOpen(true))` was flagged by lint as a
 * cascading render. This shape also means the component holds no state of its
 * own: dismissing writes to the store, the store notifies, and the card stops
 * rendering because the stored version now matches.
 */
const KEY = "fitcheck:last-seen-release";
const listeners = new Set<() => void>();

/**
 * ⚠️ Deliberately NOT cached. `getSnapshot` must be stable, and a string
 * satisfies that by value — caching would only be needed for an object, and
 * would then need resetting between tests.
 *
 * A throw means a private window or site data switched off. Answering with the
 * current version reports "already seen", so someone who cannot be remembered is
 * never told the same news on every single load with no way to stop it.
 *
 * ⚠️ Returning `null` here instead would show the user exactly the same thing —
 * nothing — so no test can tell the two apart, and a mutation sweep confirms it.
 * The difference is that `null` would send the seeding effect into a throwing
 * write on every mount. Kept because it is right, not because it is covered.
 */
function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return CURRENT_RELEASE.version;
  }
}

function write(version: string) {
  try {
    window.localStorage.setItem(KEY, version);
  } catch {
    // Nothing to do; the worst case is being told the same news twice.
  }
  for (const notify of listeners) notify();
}

/**
 * Whether this reader is owed the release note.
 *
 * ⚠️ A separate pure function because the component cannot express the `null`
 * case testably: a brand-new user's first render seeds the store, which
 * re-renders and hides the card, so a test asserting on the DOM sees "nothing
 * shown" whether the guard is there or not. Removing `seen === null` from an
 * inline condition survived a mutation sweep — it would flash the notes at a
 * first-time user and no test could see it. Here it is one obvious assertion.
 */
export function shouldShow(seen: string | null, current: string): boolean {
  if (seen === null) return false; // never been here — nothing to catch up on
  return seen !== current;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => void listeners.delete(notify);
}

export function WhatsNew() {
  // The server has no localStorage, so it answers "already seen" and renders
  // nothing — the card appears on hydration, and no markup differs.
  const seen = useSyncExternalStore(subscribe, read, () => CURRENT_RELEASE.version);

  // ⚠️ First run: record the version and show NOTHING. Someone who has never
  // used Fitcheck has nothing to catch up on, and "Fixed: ..." as a first
  // impression reads as an app that was broken.
  useEffect(() => {
    if (read() === null) write(CURRENT_RELEASE.version);
  }, []);

  if (!shouldShow(seen, CURRENT_RELEASE.version)) return null;

  return (
    <WhatsNewCard
      release={CURRENT_RELEASE}
      onDismiss={() => write(CURRENT_RELEASE.version)}
    />
  );
}
