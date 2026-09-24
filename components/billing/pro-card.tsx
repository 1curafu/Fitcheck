"use client";

import { useState } from "react";
import type { SubscriptionSummary } from "@/lib/billing/status-line";
import type { Tier } from "@/lib/billing/tiers";
import { useClientTimeZone } from "@/lib/billing/use-client-time-zone";
import { ManageSubscription } from "./manage-subscription";
import { proPriceLabel, UpgradeSheet } from "./upgrade-sheet";

/**
 * The Pro banner on the profile hub (`Fitcheck.dc.html:694-698`).
 *
 * Structure is the mockup's, verbatim: serif italic title, a one-line pitch,
 * and the price pill inside the card. An earlier version printed all seven
 * benefits here instead and read as a wall of bullets — worse to look at AND an
 * unforced divergence from a design that had already solved this.
 *
 * The whole card is the control; the pill is an affordance inside it rather
 * than a nested button, which would be invalid HTML. Tapping opens the sheet,
 * which is where the full case gets made — so the pitch lives in exactly one
 * place whether the user arrives here or from a gate.
 */
export function ProCard({ tier, subscription }: { tier: Tier; subscription?: SubscriptionSummary | null }) {
  const [open, setOpen] = useState(false);
  const isPro = tier === "pro";
  const timeZone = useClientTimeZone();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-[13px] block w-full rounded-[16px] p-5 text-left [background:linear-gradient(120deg,#b86a47,#9a5236)]"
      >
        <span className="block font-serif text-[21px] italic text-[#1a0f09]">Fitcheck Pro</span>
        <span className="mt-[5px] block max-w-[84%] text-[13px]/[1.4] text-[rgba(26,15,9,0.82)]">
          {isPro ? "Active — everything unlocked." : "Get the whole wardrobe working."}
        </span>
        <span className="mt-[13px] inline-block rounded-full bg-canvas px-[17px] py-[9px] text-[13px] font-semibold text-foreground">
          {isPro ? "Your membership" : `Go Pro · ${proPriceLabel("month", timeZone).label}`}
        </span>
      </button>

      {/* Stripe's limit-1 setting sends an existing subscriber to /profile: this is where they manage it. */}
      {isPro && (
        <div className="mt-[10px] rounded-[16px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
          <ManageSubscription
            status={subscription?.status ?? null}
            interval={subscription?.interval ?? null}
            currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
            cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
          />
        </div>
      )}

      <UpgradeSheet
        open={open}
        isPro={isPro}
        title={isPro ? "Your Pro membership" : "Get the whole wardrobe working"}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
