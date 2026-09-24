import type { BillingDeps } from "./customer";
import { pickSubscription, toBillingState, type BillingState } from "./status";

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
  const state = toBillingState(pickSubscription(await gateway.listSubscriptions(customerId)));
  await store.writeBillingState(userId, state);
  return { userId, state };
}
