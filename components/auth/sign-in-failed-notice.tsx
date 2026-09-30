"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Shown on /sign-in after the auth callback failed (`?error=auth`): an expired, reused or cancelled sign-in.
 * Strips the query once so a reload or a shared address does not repeat it.
 */
export function SignInFailedNotice() {
  const t = useTranslations("auth");
  useEffect(() => {
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <p role="alert" className="mb-5 max-w-[300px] text-center text-[13px]/[1.5] text-brand-high">
      {t("signInFailed")}
    </p>
  );
}
