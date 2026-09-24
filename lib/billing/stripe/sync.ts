import * as Sentry from "@sentry/nextjs";
import type { BillingDeps } from "./customer";
import { isKnownStatus, pickSubscription, toBillingState, type BillingState } from "./status";

/**
 * THE writer of billing state. Every trigger (return route, webhook) only names a customer; the truth is re-read
 * from Stripe, so duplicate, late or out-of-order triggers converge on the current state. Idempotent.
 */
export async function syncCustomer(
  { store, gateway }: BillingDeps,
  customerId: string,
): Promise<{ userId: string | null; state: BillingState | null }> {
  const userId = await store.userIdByCustomerId(customerId);
  if (!userId) return { userId: null, state: null };
  const subscription = pickSubscription(await gateway.listSubscriptions(customerId));
  // An unknown status fails closed to free (status.ts) — loudly, so a new Stripe status can't silently downgrade
  // paying users (spec §6).
  if (subscription && !isKnownStatus(subscription.status)) {
    Sentry.captureMessage("Unknown Stripe subscription status", {
      level: "warning",
      tags: { stripe_subscription_status: subscription.status },
    });
  }
  const state = toBillingState(subscription);
  await store.writeBillingState(userId, state);
  return { userId, state };
}
