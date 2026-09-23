import type { AccountDeletionInput, DeletionDependencies, DeletionStage } from "./types";
import { DeletionFailure } from "./types";

/**
 * The adapters' own fixed failure messages. Only these may travel with a failure to logs and Sentry: they name what
 * failed without provider text, identifiers or email. Anything else is reported as "unclassified".
 */
const SANITIZED_REASONS = new Set([
  "Invalid deletion user ID",
  "Wardrobe listing failed",
  "Wardrobe removal failed",
  "Wardrobe verification failed",
  "B2 deletion ledger configuration is required",
  "B2 authorization failed",
  "B2 key scope rejected",
  "B2 upload URL failed",
  "B2 upload failed",
  "Deletion ledger stub requires local Supabase",
  "Auth user deletion failed",
]);

async function runStage(stage: DeletionStage, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const reason = error instanceof Error && SANITIZED_REASONS.has(error.message) ? error.message : "unclassified";
    throw new DeletionFailure(stage, reason);
  }
}

export async function runAccountDeletion(
  { userId, requestedAt }: AccountDeletionInput,
  dependencies: DeletionDependencies,
): Promise<void> {
  await runStage("storage", () => dependencies.purgeStorage(userId));
  await runStage("ledger", () => dependencies.writeTombstone(userId, requestedAt));
  await runStage("auth", () => dependencies.deleteAuthUser(userId));
  // The profile is gone now, so Storage RLS refuses any further upload: this second purge catches an upload
  // from another tab or device that landed between the first purge and the Auth delete, and is final.
  await runStage("residual-storage", () => dependencies.purgeStorage(userId));
}
