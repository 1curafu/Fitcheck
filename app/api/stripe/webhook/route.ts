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
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch {
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
