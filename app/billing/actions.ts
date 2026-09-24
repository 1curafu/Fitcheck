"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBillingStore } from "@/lib/billing/admin";
import { LOOKUP_KEYS } from "@/lib/billing/prices";
import { billingEnabled, getGateway } from "@/lib/billing/stripe/client";
import { ensureCustomer } from "@/lib/billing/stripe/customer";
import { trustedOrigin } from "@/lib/billing/urls";
import { TERMS } from "@/lib/legal/terms";
import { createClient } from "@/lib/supabase/server";

const StartCheckoutInput = z.object({ interval: z.enum(["month", "year"]), waiverAccepted: z.literal(true) });

export type StartCheckoutResult = {
  status: "signed-out" | "unavailable" | "already-pro" | "waiver-required" | "error";
};

/**
 * Go Pro (spec §7.1). Identity comes only from the session; the withdrawal waiver is required server-side and never
 * assumed. Success redirects to Stripe Checkout (Managed Payments) and never returns.
 */
export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };
  if (!billingEnabled()) return { status: "unavailable" };

  const parsed = StartCheckoutInput.safeParse(input);
  if (!parsed.success) return { status: "waiver-required" };

  let url: string;
  try {
    const store = createBillingStore();
    const gateway = getGateway();
    const profile = await store.profileByUserId(user.id);
    if (!profile) return { status: "error" };
    if (profile.tier === "pro") return { status: "already-pro" };

    const now = new Date();
    await store.recordWaiver(user.id, now, TERMS.updated);
    const customerId = await ensureCustomer({ store, gateway }, { ...profile, email: user.email ?? profile.email });
    const origin = trustedOrigin((await headers()).get("origin"));
    ({ url } = await gateway.createCheckoutSession({
      customerId,
      userId: user.id,
      priceId: await gateway.priceIdForLookupKey(LOOKUP_KEYS[parsed.data.interval]),
      waiverAt: now.toISOString(),
      successUrl: `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/profile?pro=cancelled`,
    }));
  } catch {
    Sentry.captureException(new Error("Billing checkout failed"));
    return { status: "error" };
  }
  redirect(url);
}

export type OpenBillingPortalResult = { status: "signed-out" | "no-subscription" | "unavailable" | "error" };

/** Manage subscription (spec §7.4) — the Dashboard's default (next-generation) portal configuration. */
export async function openBillingPortal(): Promise<OpenBillingPortalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };
  if (!billingEnabled()) return { status: "unavailable" };

  let url: string;
  try {
    const store = createBillingStore();
    const gateway = getGateway();
    const profile = await store.profileByUserId(user.id);
    if (!profile?.stripeCustomerId) return { status: "no-subscription" };
    await ensureCustomer({ store, gateway }, { ...profile, email: user.email ?? profile.email });
    const origin = trustedOrigin((await headers()).get("origin"));
    ({ url } = await gateway.createPortalSession(profile.stripeCustomerId, `${origin}/profile`));
  } catch {
    Sentry.captureException(new Error("Billing portal failed"));
    return { status: "error" };
  }
  redirect(url);
}
