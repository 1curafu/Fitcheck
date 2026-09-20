"use client";

import { useEffect } from "react";

/** A one-time confirmation after the deletion action has signed the user out. */
export function AccountDeletedNotice() {
  useEffect(() => {
    window.history.replaceState({}, "", "/");
  }, []);

  return (
    <p role="status" className="mb-5 max-w-[280px] text-center text-[13px]/[1.5] text-muted-foreground">
      Your account and live data have been deleted.
    </p>
  );
}
