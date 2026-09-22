import "server-only";
import { writeB2Tombstone } from "./ledger.mjs";

function requiredEnvironment(name: "B2_DELETION_KEY_ID" | "B2_DELETION_APPLICATION_KEY" | "DELETION_LEDGER_HMAC_KEY"): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error("B2 deletion ledger configuration is required");
  return value;
}

function isLocalSupabase(): boolean {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return false;
    const hostname = new URL(supabaseUrl).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function validateLedgerStub(): boolean {
  if (process.env.FITCHECK_STUB_DELETION_LEDGER !== "1") return false;
  if (!isLocalSupabase()) throw new Error("Deletion ledger stub requires local Supabase");
  return true;
}

/** Validates the B2 ledger dependency before account data is purged. */
export function validateProductionDeletionTombstoneConfiguration(): void {
  if (validateLedgerStub()) return;

  requiredEnvironment("B2_DELETION_KEY_ID");
  requiredEnvironment("B2_DELETION_APPLICATION_KEY");
  requiredEnvironment("DELETION_LEDGER_HMAC_KEY");
}

/**
 * Persists the opaque restore-exclusion marker after the wardrobe purge and before the Auth delete, so the
 * record exists before the account (and, by cascade, its relational data) can disappear.
 * The e2e stub is intentionally constrained to a local Supabase project so a
 * deployment cannot silently omit this irreversible safety record.
 */
export async function writeProductionDeletionTombstone(userId: string, requestedAt: Date): Promise<void> {
  if (validateLedgerStub()) return;

  await writeB2Tombstone({
    keyId: requiredEnvironment("B2_DELETION_KEY_ID"),
    applicationKey: requiredEnvironment("B2_DELETION_APPLICATION_KEY"),
    hmacKey: requiredEnvironment("DELETION_LEDGER_HMAC_KEY"),
    userId,
    requestedAt,
  });
}
