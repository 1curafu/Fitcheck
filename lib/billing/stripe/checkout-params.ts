import type Stripe from "stripe";

export type CheckoutParams = {
  customerId: string;
  userId: string;
  priceId: string;
  waiverAt: string;
  successUrl: string;
  cancelUrl: string;
};

/** Rejected by Managed Payments (Dashboard setup wizard, 2026-09-23). Tests assert none is ever sent. */
export const FORBIDDEN_CHECKOUT_KEYS = [
  "automatic_tax", "tax_id_collection", "subscription_data.default_tax_rates", "payment_method_collection",
  "payment_method_configuration", "payment_method_options", "payment_method_types", "saved_payment_method_options",
  "customer_update", "shipping_address_collection", "shipping_options", "subscription_data.application_fee_percent",
  "subscription_data.on_behalf_of", "subscription_data.transfer_data", "subscription_data.invoice_settings",
] as const;

/**
 * The ONLY shape of Checkout Session Fitcheck creates. `managed_payments` keeps Link the merchant of record for
 * every sale — a payment without it would make the VAT ours (accountant review, 2026-09-24).
 */
export function buildCheckoutParams(p: CheckoutParams): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    customer: p.customerId,
    client_reference_id: p.userId,
    line_items: [{ price: p.priceId, quantity: 1 }],
    managed_payments: { enabled: true },
    metadata: { user_id: p.userId, waiver_at: p.waiverAt },
    subscription_data: { metadata: { user_id: p.userId } },
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
  };
}
