import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  FREE,
  PRO,
  entitlementsFor,
  checkGeneration,
  checkCloset,
  type Entitlements,
  type Tier,
  type GenerationKind,
  type GenerationCheck,
} from "./tiers";

import { UploadLimitError } from "./errors";

export { FREE, PRO, entitlementsFor, checkGeneration, checkCloset };
export { QuotaExceededError, UploadLimitError } from "./errors";
export type { Entitlements, Tier, GenerationKind, GenerationCheck };

/**
 * The user's entitlements right now.
 *
 * Reads the tier from `profiles`. A read failure returns FREE rather than
 * throwing: a broken query must never take the app down, and handing out Pro on
 * an error is the wrong side to fail on.
 *
 * `profiles.tier` is not writable by `authenticated` (see the billing
 * migration) — RLS scopes rows, not columns, so without that revoke a user
 * could grant themselves Pro from the browser.
 */
export async function currentEntitlements(): Promise<Entitlements> {
  // Local override so Pro surfaces can be built and demoed before billing.
  // Checked before the query so it works even with no session.
  if (process.env.NODE_ENV !== "production" && process.env.FITCHECK_FORCE_TIER) {
    return entitlementsFor(process.env.FITCHECK_FORCE_TIER);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE;

  const { data } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
  return entitlementsFor(data?.tier);
}

/**
 * How many rerolls this user has spent on their local today, across every
 * occasion — the allowance is a single daily pool.
 *
 * Reads the append-only `generation_events` ledger, never the `outfits` table.
 * `saveDailyLooks` is delete-then-insert, so a regenerate REPLACES the day's
 * rows for an occasion — the act of regenerating erases its own evidence, and
 * afterwards a first drop is indistinguishable from a fifth. The ledger exists
 * precisely because that count is unrecoverable from the outfits themselves.
 */
export async function regeneratesUsedToday(today: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("generated_on", today)
    .eq("kind", "regenerate");
  return count ?? 0;
}

/**
 * May this user add another piece? Throws `UploadLimitError` if not.
 *
 * Called from `uploadAndTag` rather than `confirmItem` because that is where
 * the cost actually lands — two storage writes and a Haiku call happen before
 * the user ever sees the confirm screen. A check at confirm would already have
 * paid for the item it refuses.
 *
 * Counts UNARCHIVED pieces only. Nothing in the product deletes an item, so if
 * archived pieces counted, a user at the cap would have no way back under it;
 * archiving is the intended way to make room, and an archived piece is not in
 * your closet by any reading of the word.
 */
export async function assertCanUpload(): Promise<void> {
  const e = await currentEntitlements();
  if (e.closetItems == null) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("archived", false);

  const check = checkCloset(e, count ?? 0);
  if (!check.allowed) throw new UploadLimitError(check.reason);
}

/**
 * Record a generation that actually happened.
 *
 * Called AFTER the model request succeeds — a failed generation costs the user
 * nothing, so charging for one would be charging for our own error. RLS scopes
 * the insert to the caller.
 */
export async function recordGeneration(
  userId: string,
  occasion: string,
  today: string,
  kind: GenerationKind,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("generation_events")
    .insert({ user_id: userId, occasion, generated_on: today, kind });
}
