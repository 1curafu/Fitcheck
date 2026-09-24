import { vi } from "vitest";
import type { BillingProfile, BillingStore } from "../store";
import type { StripeGateway } from "../stripe/gateway";
import type { BillingState, SubscriptionLike } from "../stripe/status";

/** In-memory BillingStore with the same claim-if-null semantics as lib/billing/admin.ts. */
export function fakeStore(profiles: BillingProfile[] = []) {
  const rows = new Map(profiles.map((p) => [p.userId, { ...p }]));
  const states = new Map<string, BillingState>();
  const events = new Set<string>();
  const waivers = new Map<string, { at: Date; version: string }>();
  const store: BillingStore = {
    profileByUserId: async (id) => rows.get(id) ?? null,
    userIdByCustomerId: async (c) => [...rows.values()].find((r) => r.stripeCustomerId === c)?.userId ?? null,
    claimCustomerId: async (id, c) => {
      const row = rows.get(id);
      if (!row) throw new Error("Billing customer claim failed");
      row.stripeCustomerId ??= c;
      return row.stripeCustomerId;
    },
    writeBillingState: async (id, s) => {
      states.set(id, s);
      const row = rows.get(id);
      if (row) row.tier = s.tier;
    },
    recordWaiver: async (id, at, version) => {
      waivers.set(id, { at, version });
    },
    hasProcessedEvent: async (e) => events.has(e),
    markEventProcessed: async (e) => {
      events.add(e);
    },
  };
  return { store, rows, states, events, waivers };
}

export const sub = (id: string, status: string, end = 2_000_000_000, interval = "month"): SubscriptionLike => ({
  id,
  status,
  cancel_at_period_end: false,
  items: { data: [{ current_period_end: end, price: { recurring: { interval } } }] },
});

export function fakeGateway(subs: Record<string, SubscriptionLike[]> = {}) {
  return {
    priceIdForLookupKey: vi.fn(async (k: string) => `price_${k}`),
    createCustomer: vi.fn(async (_input: { email: string | null; userId: string }) => "cus_new"),
    customerEmail: vi.fn(async (_id: string): Promise<string | null> => "old@example.com"),
    updateCustomerEmail: vi.fn(async (_id: string, _email: string) => {}),
    createCheckoutSession: vi.fn(async (_p: unknown) => ({ url: "https://checkout.stripe.com/c/pay/cs_test" })),
    retrieveCheckoutSession: vi.fn(async (_id: string) => ({
      clientReferenceId: "u1" as string | null,
      customerId: "cus_1" as string | null,
    })),
    listSubscriptions: vi.fn(async (c: string) => subs[c] ?? []),
    cancelSubscriptionNow: vi.fn(async (_id: string) => {}),
    createPortalSession: vi.fn(async (_c: string, _r: string) => ({ url: "https://billing.stripe.com/p/session/x" })),
  } satisfies StripeGateway;
}
