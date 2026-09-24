import * as Sentry from "@sentry/nextjs";
import type Stripe from "stripe";
import { createBillingStore } from "@/lib/billing/admin";
import { constructWebhookEvent, getGateway } from "@/lib/billing/stripe/client";
import { handleStripeEvent } from "@/lib/billing/stripe/webhook";

/**
 * Stripe → Fitcheck (spec §7.3). Unauthenticated by design: the signature IS the authentication, and proxy.ts
 * excludes this path so no session refresh runs. The body must be read raw — parsing it before verification breaks
 * the signature.
 */
export async function POST(request: Request): Promise<Response> {
  // A missing secret is OUR misconfiguration: 500 (Stripe retries) and an alert, never a quiet 400 (review I2).
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    Sentry.captureException(new Error("Stripe webhook not configured"));
    await Sentry.flush(2000);
    return new Response("not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch {
    // Usually a scanner — but also exactly what a wrong secret (e.g. the `stripe listen` one) looks like.
    Sentry.captureMessage("Stripe webhook signature rejected", "warning");
    await Sentry.flush(2000);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent({ store: createBillingStore(), gateway: getGateway() }, event);
    return new Response("ok", { status: 200 });
  } catch {
    // 500 makes Stripe retry; the event id was not recorded, so the retry is processed, not skipped.
    Sentry.captureException(new Error("Stripe webhook handling failed"), { tags: { stripe_event_type: event.type } });
    await Sentry.flush(2000);
    return new Response("retry", { status: 500 });
  }
}
