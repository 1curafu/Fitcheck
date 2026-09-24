import { NextResponse } from "next/server";
import { createBillingStore } from "@/lib/billing/admin";
import { getGateway } from "@/lib/billing/stripe/client";
import { syncCustomer } from "@/lib/billing/stripe/sync";
import { createClient } from "@/lib/supabase/server";

/**
 * Back from Stripe Checkout (spec §7.2). The URL grants nothing: the Checkout Session must belong to the signed-in
 * user, and the state written is re-read from Stripe. It only saves the user waiting for the webhook.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return to("/");

  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return to("/profile");

  try {
    const gateway = getGateway();
    const session = await gateway.retrieveCheckoutSession(sessionId);
    if (session.clientReferenceId !== user.id || !session.customerId) return to("/profile");
    await syncCustomer({ store: createBillingStore(), gateway }, session.customerId);
  } catch {
    // The webhook converges the tier; the profile shows "Activating Pro…" until then.
  }
  return to("/profile?pro=welcome");
}
