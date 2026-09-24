"use client";

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
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const line = statusLine(props);

  return (
    <div className="px-4 py-3">
      {line && <p className="text-[13px] text-muted-foreground">{line}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setFailed(false);
            // Success redirects to Stripe; any returned value is a failure to explain.
            const result = await openBillingPortal();
            if (result) setFailed(true);
          })
        }
        className="mt-2 min-h-[44px] w-full rounded-[14px] text-[14px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--hairline-2)] disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage subscription"}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-[13px] text-muted-foreground">
          Couldn&apos;t open billing. Try again in a moment.
        </p>
      )}
    </div>
  );
}
