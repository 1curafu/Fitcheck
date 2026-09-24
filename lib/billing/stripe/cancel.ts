import type { BillingDeps } from "./customer";
import { tierForStatus } from "./status";

/** Anything Stripe could still charge: Pro-granting statuses plus the two that retry payment. */
const canStillCharge = (status: string): boolean =>
  tierForStatus(status) === "pro" || status === "incomplete" || status === "unpaid";

/** Account-deletion stage `billing`: nothing may renew once the account is gone. Fails closed. */
export async function cancelAllSubscriptions({ gateway }: BillingDeps, customerId: string | null): Promise<void> {
  if (!customerId) return;
  try {
    for (const s of await gateway.listSubscriptions(customerId)) {
      if (canStillCharge(s.status)) await gateway.cancelSubscriptionNow(s.id);
    }
    const left = (await gateway.listSubscriptions(customerId)).filter((s) => canStillCharge(s.status));
    if (left.length > 0) throw new Error("left");
  } catch {
    throw new Error("Billing cancellation failed");
  }
}
