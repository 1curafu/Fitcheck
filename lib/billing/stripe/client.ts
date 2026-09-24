import "server-only";

import Stripe from "stripe";
import { createStripeGateway, createStubGateway, type StripeGateway } from "./gateway";

/** The e2e stub (like FITCHECK_STUB_AI) — never on a Vercel production deployment. */
function stubAllowed(): boolean {
  return process.env.FITCHECK_STUB_STRIPE === "1" && process.env.VERCEL_ENV !== "production";
}

/** Server-side switch. The client's twin is NEXT_PUBLIC_BILLING_ENABLED; both are set together. */
export function billingEnabled(): boolean {
  if (stubAllowed()) return true;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

let cached: StripeGateway | null = null;

export function getGateway(): StripeGateway {
  if (stubAllowed()) return createStubGateway();
  if (!billingEnabled()) throw new Error("Billing is not configured");
  cached ??= createStripeGateway(new Stripe(process.env.STRIPE_SECRET_KEY as string, { maxNetworkRetries: 2 }));
  return cached;
}

/** Verifies Stripe's signature over the RAW body. Throws on any mismatch. */
export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.trim()) throw new Error("Billing is not configured");
  return Stripe.webhooks.constructEvent(body, signature, secret);
}
