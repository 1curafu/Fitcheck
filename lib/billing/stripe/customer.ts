import type { BillingProfile, BillingStore } from "../store";
import type { StripeGateway } from "./gateway";

export type BillingDeps = { store: BillingStore; gateway: StripeGateway };

/**
 * One Stripe customer per user (Stripe's limit-1 setting relies on it), and its email kept in step with the sign-in
 * email so receipts follow an email change (spec §6).
 */
export async function ensureCustomer({ store, gateway }: BillingDeps, profile: BillingProfile): Promise<string> {
  if (profile.stripeCustomerId) {
    if (profile.email) {
      const current = await gateway.customerEmail(profile.stripeCustomerId);
      if (current !== profile.email) await gateway.updateCustomerEmail(profile.stripeCustomerId, profile.email);
    }
    return profile.stripeCustomerId;
  }
  const created = await gateway.createCustomer({ email: profile.email, userId: profile.userId });
  // Claim-if-null: a racing tab may have stored its own customer first; we then use the winner's.
  return store.claimCustomerId(profile.userId, created);
}
