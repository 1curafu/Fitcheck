import "server-only";

import Stripe from "stripe";
import { createStripeGateway, createStubGateway, type StripeGateway } from "./gateway";

/**
 * ⚠️ Vercel Preview deployments share the PRODUCTION Supabase (same env vars; docs/STATE.md). Billing there would put
 * test-mode customers and test-card Pro onto real profiles and later break checkout, the portal and account deletion
 * for those users (review C2). Billing refuses Preview until Preview has its own database.
 */
function onVercelPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/** The e2e stub (like FITCHECK_STUB_AI) — local and CI only: never on any Vercel deployment. */
function stubAllowed(): boolean {
  return process.env.FITCHECK_STUB_STRIPE === "1" && !process.env.VERCEL_ENV;
}

/** Server-side switch. The client's twin is NEXT_PUBLIC_BILLING_ENABLED; both are set together. */
export function billingEnabled(): boolean {
  if (onVercelPreview()) return false;
  if (stubAllowed()) return true;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

let cached: StripeGateway | null = null;

export function getGateway(): StripeGateway {
  if (onVercelPreview()) throw new Error("Billing is not configured");
  if (stubAllowed()) return createStubGateway();
  if (!billingEnabled()) throw new Error("Billing is not configured");
  // 10 s × (1 + 1 retry) stays well inside a serverless function's limit; the SDK default (80 s) does not (review M6).
  cached ??= createStripeGateway(
    new Stripe(process.env.STRIPE_SECRET_KEY as string, { timeout: 10_000, maxNetworkRetries: 1 }),
  );
  return cached;
}

/** Verifies Stripe's signature over the RAW body. Throws on any mismatch. */
export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.trim()) throw new Error("Billing is not configured");
  return Stripe.webhooks.constructEvent(body, signature, secret);
}
