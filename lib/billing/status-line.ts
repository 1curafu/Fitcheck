import { formatShortDate } from "@/lib/i18n/format";
import type { ShippedLocale } from "@/lib/i18n/locales";

export type SubscriptionSummary = {
  status: string | null;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

// UTC plus fixed month names keep server HTML and Safari hydration identical.
const renewalDate = (iso: string, locale: ShippedLocale) => formatShortDate(new Date(iso), locale, true);

/** One line describing a Pro subscription for the Profile card and Settings. */
export function statusLine(s: SubscriptionSummary, locale: ShippedLocale = "en-GB"):
  | { message: "billing.paymentFailed" }
  | { message: "billing.proUntil"; values: { date: string } }
  | { message: "billing.proRenews"; values: { plan: "billing.annual" | "billing.monthly"; date: string } }
  | { message: "billing.proPlan"; values: { plan: "billing.annual" | "billing.monthly" } }
  | null {
  if (!s.status) return null;
  if (s.status === "past_due") return { message: "billing.paymentFailed" };
  const date = s.currentPeriodEnd ? renewalDate(s.currentPeriodEnd, locale) : null;
  if (s.cancelAtPeriodEnd && date) return { message: "billing.proUntil", values: { date } };
  const plan = s.interval === "year" ? "billing.annual" : "billing.monthly";
  return date ? { message: "billing.proRenews", values: { plan, date } }
    : { message: "billing.proPlan", values: { plan } };
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
