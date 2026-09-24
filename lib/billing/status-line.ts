export type SubscriptionSummary = {
  status: string | null;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

// This text is server-rendered and hydrated, so it must come out identical in Node and in Safari (review I1). Not
// Intl: even with a fixed locale the engines' ICU data differ — Node writes "Sept" for en-GB where Safari writes
// "Sep". The UI is English; a renewal date shown as its UTC day is off by at most a few hours near midnight.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const renewalDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** One line describing a Pro subscription for the Profile card and Settings. */
export function statusLine(s: SubscriptionSummary): string | null {
  if (!s.status) return null;
  if (s.status === "past_due") return "Payment failed — update your card";
  const date = s.currentPeriodEnd ? renewalDate(s.currentPeriodEnd) : null;
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
