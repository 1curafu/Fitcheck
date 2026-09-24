import { cancelAllSubscriptions } from "./cancel";
import type { BillingDeps } from "./customer";
import { syncCustomer } from "./sync";

export const HANDLED_EVENT_TYPES: ReadonlySet<string> = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  // A refund does not end a subscription in Stripe; entitlement follows the subscription. See below.
  "charge.refunded",
]);

type EventLike = { id: string; type: string; data: { object: unknown } };

export function customerIdOf(event: EventLike): string | null {
  const customer = (event.data.object as { customer?: string | { id?: string } | null }).customer;
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

/**
 * Owner decision 2026-09-24: a refund must never leave a free subscription behind. A FULL refund (`refunded: true`
 * on the charge) cancels every subscription that could still charge, immediately — the account-deletion path, which
 * verifies afterwards and fails closed. A partial refund is a goodwill gesture and leaves the subscription alone.
 */
function isFullRefund(event: EventLike): boolean {
  return event.type === "charge.refunded" && (event.data.object as { refunded?: unknown }).refunded === true;
}

/** Order matters: dedupe → (cancel on full refund) → sync → record. Recording only after success keeps Stripe's retry meaningful. */
export async function handleStripeEvent(
  deps: BillingDeps,
  event: EventLike,
): Promise<"duplicate" | "ignored" | "synced" | "unknown-customer"> {
  if (!HANDLED_EVENT_TYPES.has(event.type)) return "ignored";
  if (await deps.store.hasProcessedEvent(event.id)) return "duplicate";
  const customerId = customerIdOf(event);
  if (isFullRefund(event)) await cancelAllSubscriptions(deps, customerId);
  const result = customerId ? await syncCustomer(deps, customerId) : { userId: null };
  await deps.store.markEventProcessed(event.id, event.type);
  return result.userId ? "synced" : "unknown-customer";
}
