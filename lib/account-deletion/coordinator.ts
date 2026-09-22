import type { AccountDeletionInput, DeletionDependencies, DeletionStage } from "./types";
import { DeletionFailure } from "./types";

async function runStage(stage: DeletionStage, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    throw new DeletionFailure(stage);
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
