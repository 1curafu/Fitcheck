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
]);

type EventLike = { id: string; type: string; data: { object: unknown } };

export function customerIdOf(event: EventLike): string | null {
  const customer = (event.data.object as { customer?: string | { id?: string } | null }).customer;
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

/** Order matters: dedupe → sync → record. Recording only after success keeps Stripe's retry meaningful. */
export async function handleStripeEvent(
  deps: BillingDeps,
  event: EventLike,
): Promise<"duplicate" | "ignored" | "synced" | "unknown-customer"> {
  if (!HANDLED_EVENT_TYPES.has(event.type)) return "ignored";
  if (await deps.store.hasProcessedEvent(event.id)) return "duplicate";
  const customerId = customerIdOf(event);
  const result = customerId ? await syncCustomer(deps, customerId) : { userId: null };
  await deps.store.markEventProcessed(event.id, event.type);
  return result.userId ? "synced" : "unknown-customer";
}
