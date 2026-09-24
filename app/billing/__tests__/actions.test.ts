import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
const h = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((u: string) => {
    throw new Error(`REDIRECT ${u}`);
  }),
  enabled: vi.fn(() => true),
  store: {} as Record<string, unknown>,
  gateway: {} as Record<string, unknown>,
}));
vi.mock("next/navigation", () => ({ redirect: h.redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://fitcheck.space" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: h.getUser } }) }));
vi.mock("@/lib/billing/stripe/client", () => ({ billingEnabled: h.enabled, getGateway: () => h.gateway }));
vi.mock("@/lib/billing/admin", () => ({ createBillingStore: () => h.store }));
import { fakeGateway, fakeStore } from "@/lib/billing/__tests__/fakes";
import { openBillingPortal, startCheckout } from "../actions";

let waivers: Map<string, { at: Date; version: string }>;
let gateway: ReturnType<typeof fakeGateway>;

beforeEach(() => {
  vi.clearAllMocks();
  h.enabled.mockReturnValue(true);
  h.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.c" } } });
  const fs = fakeStore([{ userId: "u1", email: "a@b.c", stripeCustomerId: null, tier: "free" }]);
  waivers = fs.waivers;
  for (const k of Object.keys(h.store)) delete h.store[k];
  Object.assign(h.store, fs.store);
  gateway = fakeGateway();
  for (const k of Object.keys(h.gateway)) delete h.gateway[k];
  Object.assign(h.gateway, gateway);
});

it("refuses without a session", async () => {
  h.getUser.mockResolvedValue({ data: { user: null } });
  await expect(startCheckout({ interval: "month", waiverAccepted: true })).resolves.toEqual({ status: "signed-out" });
});

it("refuses when billing is off", async () => {
  h.enabled.mockReturnValue(false);
  await expect(startCheckout({ interval: "month", waiverAccepted: true })).resolves.toEqual({ status: "unavailable" });
});

it("never assumes the waiver", async () => {
  await expect(startCheckout({ interval: "month", waiverAccepted: false })).resolves.toEqual({ status: "waiver-required" });
  expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
  expect(waivers.size).toBe(0);
});

it("rejects malformed input as waiver-required, not as a crash", async () => {
  await expect(startCheckout({ interval: "decade", waiverAccepted: "yes" })).resolves.toEqual({ status: "waiver-required" });
});

it("records the waiver, then redirects to Stripe Checkout with the annual price", async () => {
  await expect(startCheckout({ interval: "year", waiverAccepted: true })).rejects.toThrow(
    /^REDIRECT https:\/\/checkout\.stripe\.com/,
  );
  expect(waivers.get("u1")?.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(gateway.priceIdForLookupKey).toHaveBeenCalledWith("pro_annual");
  expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "u1",
      customerId: "cus_new",
      successUrl: "https://fitcheck.space/billing/return?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://fitcheck.space/profile?pro=cancelled",
    }),
  );
});

it("an already-Pro user is sent to manage, not charged twice", async () => {
  h.store.profileByUserId = async () => ({ userId: "u1", email: "a@b.c", stripeCustomerId: "cus_1", tier: "pro" });
  await expect(startCheckout({ interval: "month", waiverAccepted: true })).resolves.toEqual({ status: "already-pro" });
  expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
});

it("a Stripe failure is a calm error, not a crash", async () => {
  gateway.createCheckoutSession.mockRejectedValue(new Error("stripe says no"));
  await expect(startCheckout({ interval: "month", waiverAccepted: true })).resolves.toEqual({ status: "error" });
});

it("portal needs a customer", async () => {
  await expect(openBillingPortal()).resolves.toEqual({ status: "no-subscription" });
});

it("portal opens for a customer, returning to the profile", async () => {
  h.store.profileByUserId = async () => ({ userId: "u1", email: "a@b.c", stripeCustomerId: "cus_1", tier: "pro" });
  await expect(openBillingPortal()).rejects.toThrow(/^REDIRECT https:\/\/billing\.stripe\.com/);
  expect(gateway.createPortalSession).toHaveBeenCalledWith("cus_1", "https://fitcheck.space/profile");
});
