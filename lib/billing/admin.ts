import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BillingStore } from "./store";
import { entitlementsFor } from "./tiers";

/**
 * The third reviewed service-role boundary (after lib/weather/store.ts and lib/account-deletion/admin.ts).
 *
 * It may read profiles' billing fields and the user's Auth email, and write ONLY `tier`, the billing columns and
 * `stripe_events`. `authenticated` holds no UPDATE on any of those (migrations 20260924090000 + 20260925090000), so
 * this module is the one place the tier can change. Never widen it into a general admin client.
 */
function env(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error("Billing configuration is required");
  return value;
}

function serviceClient(): SupabaseClient {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createBillingStore(): BillingStore {
  const db = serviceClient();
  return {
    async profileByUserId(userId) {
      const { data, error } = await db
        .from("profiles")
        .select("id, stripe_customer_id, tier")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error("Billing profile read failed");
      if (!data) return null;
      const { data: auth } = await db.auth.admin.getUserById(userId);
      return {
        userId,
        email: auth?.user?.email ?? null,
        stripeCustomerId: (data.stripe_customer_id as string | null) ?? null,
        tier: entitlementsFor(data.tier).tier,
      };
    },

    async userIdByCustomerId(customerId) {
      const { data, error } = await db.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
      if (error) throw new Error("Billing profile read failed");
      return (data?.id as string | undefined) ?? null;
    },

    async claimCustomerId(userId, customerId) {
      // Conditional write: a racing tab that stored its customer first wins, and we read back whichever id stuck.
      await db.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId).is("stripe_customer_id", null);
      const { data, error } = await db.from("profiles").select("stripe_customer_id").eq("id", userId).single();
      if (error || !data?.stripe_customer_id) throw new Error("Billing customer claim failed");
      return data.stripe_customer_id as string;
    },

    async writeBillingState(userId, state) {
      const { error } = await db
        .from("profiles")
        .update({
          stripe_subscription_id: state.subscriptionId,
          subscription_status: state.status,
          subscription_interval: state.interval,
          current_period_end: state.currentPeriodEnd,
          cancel_at_period_end: state.cancelAtPeriodEnd,
          tier: state.tier,
        })
        .eq("id", userId);
      if (error) throw new Error("Billing state write failed");
    },

    async recordWaiver(userId, at, termsVersion) {
      const { error } = await db
        .from("profiles")
        .update({ pro_waiver_accepted_at: at.toISOString(), pro_waiver_terms_version: termsVersion })
        .eq("id", userId);
      if (error) throw new Error("Billing waiver write failed");
    },

    async hasProcessedEvent(eventId) {
      const { data, error } = await db.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
      if (error) throw new Error("Billing event read failed");
      return Boolean(data);
    },

    async markEventProcessed(eventId, type) {
      const { error } = await db.from("stripe_events").upsert({ id: eventId, type });
      if (error) throw new Error("Billing event write failed");
    },
  };
}
