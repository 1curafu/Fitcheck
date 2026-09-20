import "server-only";

import { createDeletionAdminClient, hardDeleteAuthUser } from "./admin";
import { validateProductionDeletionTombstoneConfiguration, writeProductionDeletionTombstone } from "./b2-writer";
import { runAccountDeletion } from "./coordinator";
import { purgeWardrobePrefix } from "./storage.mjs";

/** Runs account deletion with production-only privileged adapters. */
export async function deleteLiveAccount(userId: string, requestedAt: Date): Promise<void> {
  const admin = createDeletionAdminClient();
  validateProductionDeletionTombstoneConfiguration();

  await runAccountDeletion(
    { userId, requestedAt },
    {
      purgeStorage: (id) => purgeWardrobePrefix(admin, id),
      writeTombstone: writeProductionDeletionTombstone,
      deleteAuthUser: (id) => hardDeleteAuthUser(admin, id),
    },
  );
}
