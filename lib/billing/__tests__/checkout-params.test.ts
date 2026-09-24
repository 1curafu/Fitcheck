import { expect, it } from "vitest";
import { buildCheckoutParams, FORBIDDEN_CHECKOUT_KEYS } from "../stripe/checkout-params";

const base = {
  customerId: "cus_1", userId: "u1", priceId: "price_1", waiverAt: "2026-09-25T10:00:00.000Z",
  successUrl: "https://fitcheck.space/billing/return?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl: "https://fitcheck.space/profile?pro=cancelled",
};

it("always enables Managed Payments", () => {
  expect(buildCheckoutParams(base).managed_payments).toEqual({ enabled: true });
});

it("is a subscription for this customer, tagged with the user", () => {
  expect(buildCheckoutParams(base)).toMatchObject({
    mode: "subscription", customer: "cus_1", client_reference_id: "u1",
    line_items: [{ price: "price_1", quantity: 1 }],
    metadata: { user_id: "u1", waiver_at: base.waiverAt },
    subscription_data: { metadata: { user_id: "u1" } },
    success_url: base.successUrl, cancel_url: base.cancelUrl,
  });
});

it("never sends a parameter Managed Payments rejects", () => {
  const flat = JSON.stringify(buildCheckoutParams(base));
  for (const key of FORBIDDEN_CHECKOUT_KEYS) expect(flat).not.toContain(`"${key.split(".").pop()}"`);
});
