import type { Tier } from "@/lib/billing/tiers";

/** The slice of a Stripe Subscription we read. Structural so tests need no SDK objects. */
export type SubscriptionLike = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  items: { data: Array<{ current_period_end: number; price: { recurring: { interval: string } | null } }> };
};

export type BillingState = {
  subscriptionId: string | null;
  status: string | null;
  interval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  tier: Tier;
};

// Owner decision 2026-09-23: `past_due` keeps Pro while Smart Retries run (≈2 weeks); Stripe then cancels.
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Unknown statuses fail CLOSED to free, like `entitlementsFor`. */
export function tierForStatus(status: string | null): Tier {
  return status !== null && PRO_STATUSES.has(status) ? "pro" : "free";
}

const KNOWN = new Set([...PRO_STATUSES, "canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]);
export function isKnownStatus(status: string): boolean {
  return KNOWN.has(status);
}

/** In this API version (2025-03-31.basil and later) the period lives on items; a single-price subscription has one. */
function periodEnd(sub: SubscriptionLike): number {
  return Math.max(0, ...sub.items.data.map((i) => i.current_period_end));
}

/** Deterministic even though limit-1 should make >1 impossible: Pro-granting first, then latest period end. */
export function pickSubscription(subs: SubscriptionLike[]): SubscriptionLike | null {
  if (subs.length === 0) return null;
  const pro = subs.filter((s) => tierForStatus(s.status) === "pro");
  const pool = pro.length > 0 ? pro : subs;
  return pool.reduce((best, s) => (periodEnd(s) > periodEnd(best) ? s : best));
}

export const FREE_STATE: BillingState = {
  subscriptionId: null,
  status: null,
  interval: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  tier: "free",
};

export function toBillingState(sub: SubscriptionLike | null): BillingState {
  if (!sub) return FREE_STATE;
  const raw = sub.items.data[0]?.price.recurring?.interval;
  const end = periodEnd(sub);
  return {
    subscriptionId: sub.id,
    status: sub.status,
    interval: raw === "month" || raw === "year" ? raw : null,
    currentPeriodEnd: end > 0 ? new Date(end * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    tier: tierForStatus(sub.status),
  };
}
