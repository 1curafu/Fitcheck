export type SubscriptionSummary = {
  status: string | null;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/** One line describing a Pro subscription for the Profile card and Settings. */
export function statusLine(s: SubscriptionSummary, locale?: string): string | null {
  if (!s.status) return null;
  if (s.status === "past_due") return "Payment failed — update your card";
  const date = s.currentPeriodEnd
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(s.currentPeriodEnd))
    : null;
  if (s.cancelAtPeriodEnd && date) return `Pro until ${date}`;
  const plan = s.interval === "year" ? "Annual" : "Monthly";
  return date ? `Pro · ${plan} — renews ${date}` : `Pro · ${plan}`;
}

type BillingRow = {
  tier?: unknown;
  subscription_status?: string | null;
  subscription_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

/** Narrows a `profiles` row to the summary the UI shows — null unless the user is Pro. */
export function subscriptionFromRow(row: BillingRow | null | undefined): SubscriptionSummary | null {
  if (!row || row.tier !== "pro") return null;
  const interval = row.subscription_interval;
  return {
    status: row.subscription_status ?? null,
    interval: interval === "month" || interval === "year" ? interval : null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
  };
}
