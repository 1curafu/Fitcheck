import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
const sentry = vi.hoisted(() => ({ captureException: vi.fn(), captureMessage: vi.fn(), flush: vi.fn(async () => true) }));
vi.mock("@sentry/nextjs", () => sentry);
const { handleStripeEvent } = vi.hoisted(() => ({ handleStripeEvent: vi.fn() }));
vi.mock("@/lib/billing/stripe/webhook", () => ({ handleStripeEvent }));
vi.mock("@/lib/billing/admin", () => ({ createBillingStore: () => ({}) }));
import { POST } from "../route";

const SECRET = "whsec_test_secret";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
});

const signed = (payload: string) =>
  new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) },
  });

it("rejects a bad signature with 400 and never handles the event", async () => {
  const res = await POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=bad" },
    }),
  );
  expect(res.status).toBe(400);
  expect(handleStripeEvent).not.toHaveBeenCalled();
});

it("handles a correctly signed event with 200", async () => {
  handleStripeEvent.mockResolvedValue("synced");
  const res = await POST(signed(JSON.stringify({ id: "evt_1", type: "invoice.paid", data: { object: { customer: "cus_1" } } })));
  expect(res.status).toBe(200);
  expect(handleStripeEvent).toHaveBeenCalledOnce();
});

it("returns 500 when handling fails, so Stripe retries", async () => {
  handleStripeEvent.mockRejectedValue(new Error("boom"));
  const res = await POST(signed(JSON.stringify({ id: "evt_2", type: "invoice.paid", data: { object: { customer: "c" } } })));
  expect(res.status).toBe(500);
});


// Review I2: a missing or wrong secret must be loud — otherwise renewals and cancellations stop syncing unseen.
it("a missing webhook secret is a 500 and a Sentry alert, not a quiet 400", async () => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
  expect(res.status).toBe(500);
  expect(sentry.captureException).toHaveBeenCalledWith(new Error("Stripe webhook not configured"));
  expect(handleStripeEvent).not.toHaveBeenCalled();
});

it("a rejected signature is still 400, but reported", async () => {
  const res = await POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: { "stripe-signature": "t=1,v1=bad" },
    }),
  );
  expect(res.status).toBe(400);
  expect(sentry.captureMessage).toHaveBeenCalledWith("Stripe webhook signature rejected", "warning");
});
