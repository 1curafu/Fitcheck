import type Stripe from "stripe";
import { buildCheckoutParams, type CheckoutParams } from "./checkout-params";
import type { SubscriptionLike } from "./status";

/** Every Stripe call Fitcheck makes. Logic depends on this interface, so tests use a fake and never the SDK. */
export interface StripeGateway {
  priceIdForLookupKey(key: string): Promise<string>;
  createCustomer(input: { email: string | null; userId: string }): Promise<string>;
  customerEmail(customerId: string): Promise<string | null>;
  updateCustomerEmail(customerId: string, email: string): Promise<void>;
  createCheckoutSession(params: CheckoutParams): Promise<{ url: string }>;
  retrieveCheckoutSession(id: string): Promise<{ clientReferenceId: string | null; customerId: string | null }>;
  listSubscriptions(customerId: string): Promise<SubscriptionLike[]>;
  cancelSubscriptionNow(subscriptionId: string): Promise<void>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
}

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  v == null ? null : typeof v === "string" ? v : v.id;

const PRICE_TTL_MS = 10 * 60_000;

export function createStripeGateway(stripe: Stripe): StripeGateway {
  const priceCache = new Map<string, { id: string; at: number }>();
  return {
    async priceIdForLookupKey(key) {
      const hit = priceCache.get(key);
      if (hit && Date.now() - hit.at < PRICE_TTL_MS) return hit.id;
      const { data } = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
      if (!data[0]) throw new Error("Billing price not found");
      priceCache.set(key, { id: data[0].id, at: Date.now() });
      return data[0].id;
    },
    async createCustomer({ email, userId }) {
      const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { user_id: userId } });
      return customer.id;
    },
    async customerEmail(customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      return "deleted" in customer && customer.deleted ? null : (customer.email ?? null);
    },
    async updateCustomerEmail(customerId, email) {
      await stripe.customers.update(customerId, { email });
    },
    async createCheckoutSession(params) {
      const session = await stripe.checkout.sessions.create(buildCheckoutParams(params));
      if (!session.url) throw new Error("Billing checkout failed");
      return { url: session.url };
    },
    async retrieveCheckoutSession(id) {
      const session = await stripe.checkout.sessions.retrieve(id);
      return { clientReferenceId: session.client_reference_id ?? null, customerId: idOf(session.customer) };
    },
    async listSubscriptions(customerId) {
      const { data } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
      return data as unknown as SubscriptionLike[];
    },
    async cancelSubscriptionNow(subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId);
    },
    async createPortalSession(customerId, returnUrl) {
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
      return { url: session.url };
    },
  };
}

/**
 * e2e only (FITCHECK_STUB_STRIPE=1; client.ts refuses it on Vercel production). No network: checkout "succeeds" by
 * sending the browser straight back to /profile?pro=stub-checkout, so a WebKit test can prove the gate without Stripe.
 */
export function createStubGateway(): StripeGateway {
  return {
    priceIdForLookupKey: async (key) => `price_stub_${key}`,
    createCustomer: async ({ userId }) => `cus_stub_${userId.slice(0, 8)}`,
    customerEmail: async () => null,
    updateCustomerEmail: async () => {},
    createCheckoutSession: async () => ({ url: "/profile?pro=stub-checkout" }),
    retrieveCheckoutSession: async () => ({ clientReferenceId: null, customerId: null }),
    listSubscriptions: async () => [],
    cancelSubscriptionNow: async () => {},
    createPortalSession: async () => ({ url: "/profile?pro=stub-portal" }),
  };
}
