"use client";
import { useTranslations } from "next-intl";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import { openBillingPortal } from "@/app/billing/actions";
import { statusLine, type SubscriptionSummary } from "@/lib/billing/status-line";

/**
 * "Manage subscription" → Stripe Customer Portal (cancel, switch monthly/annual, card, invoices).
 *
 * ⚠️ Must stay on /profile: Stripe's "limit customers to 1 subscription" setting sends an existing subscriber who
 * tries to buy again to https://fitcheck.space/profile. It lives in Settings too.
 */
export function ManageSubscription(props: SubscriptionSummary) {
  const t = useTranslations("billing");
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const line = statusLine(props);

  return (
    <div className="px-4 py-3">
      {line && <p className="text-[13px] text-muted-foreground">{line.message === "billing.paymentFailed" ? t("paymentFailed")
        : line.message === "billing.proUntil" ? t("proUntil", line.values)
          : t(line.message === "billing.proRenews" ? "proRenews" : "proPlan", { ...line.values, plan: t(line.values.plan === "billing.annual" ? "annual" : "monthly") })}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(false);
            // Success redirects to Stripe; any returned value — or a rejection (review M6) — is a failure to explain.
            try {
              const result = await openBillingPortal();
              if (result) setFailed(true);
            } catch (e) {
              unstable_rethrow(e); // let a Next redirect through
              setFailed(true);
            }
          })
        }
        className="mt-2 min-h-[44px] w-full rounded-[14px] text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--hairline-2)] disabled:opacity-50"
      >
        {pending ? t("opening") : t("manageSubscription")}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-[13px] text-muted-foreground">
          {t("openFailed")}
        </p>
      )}
    </div>
  );
}
