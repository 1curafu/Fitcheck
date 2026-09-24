import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), flush: vi.fn(async () => true) }));
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
