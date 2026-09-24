"use client";

import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * The device's time zone — but `undefined` during server render AND hydration, so server HTML never depends on where
 * the server runs (review I1: UTC server vs Berlin phone was a hydration mismatch). React re-renders with the real
 * zone right after hydration.
 */
export function useClientTimeZone(): string | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => undefined,
  );
}
