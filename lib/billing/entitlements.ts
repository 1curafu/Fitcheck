import "server-only";
import { createClient } from "@/lib/supabase/server";
import { localDateFor } from "@/lib/outfits/local-date";
import {
  FREE,
  PRO,
  entitlementsFor,
  checkGeneration,
  checkUploads,
  type Entitlements,
  type Tier,
  type GenerationKind,
  type GenerationCheck,
} from "./tiers";

import { UploadLimitError } from "./errors";

export { FREE, PRO, entitlementsFor, checkGeneration, checkUploads };
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
 * How many times this user has already regenerated ONE occasion on their local
 * today.
 *
 * Reads the append-only `generation_events` ledger, never the `outfits` table.
 * `saveDailyLooks` is delete-then-insert, so a regenerate REPLACES the day's
 * rows for an occasion — the act of regenerating erases its own evidence, and
 * afterwards a first drop is indistinguishable from a fifth. The ledger exists
 * precisely because that count is unrecoverable from the outfits themselves.
 */
export async function regeneratesUsedToday(occasion: string, today: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("occasion", occasion)
    .eq("generated_on", today)
    .eq("kind", "regenerate");
  return count ?? 0;
}

/**
 * May this user add another piece? Throws `UploadLimitError` if not.
 *
 * Called from `uploadAndTag` rather than `confirmItem` because that is where
 * the cost actually lands — two storage writes and a Haiku call happen before
 * the user ever sees the confirm screen.
 *
 * Counting: candidate rows are narrowed to the last 48 hours in SQL, then
 * filtered through `localDateFor`. Comparing the user's local day against a
 * `timestamptz` otherwise needs timezone arithmetic with DST edges; a two-day
 * window is at most a couple of dozen rows for one user, and it reuses the
 * date function the whole product is already keyed on rather than inventing a
 * second, subtly different one.
 */
export async function assertCanUpload(timeZone: string): Promise<void> {
  const e = await currentEntitlements();
  if (e.uploadsPerDay == null) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date();
  const since = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("items")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", since);

  const today = localDateFor(now, timeZone);
  // Archived pieces still count — the upload already cost the storage write and
  // the tagging call, and archiving to reset the meter would be a free retry.
  const addedToday = (data ?? []).filter(
    (r) => r.created_at && localDateFor(new Date(r.created_at), timeZone) === today,
  ).length;

  const check = checkUploads(e, addedToday);
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
