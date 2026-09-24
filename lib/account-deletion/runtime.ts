import "server-only";

import { createBillingStore } from "@/lib/billing/admin";
import { cancelAllSubscriptions } from "@/lib/billing/stripe/cancel";
import { billingEnabled, getGateway } from "@/lib/billing/stripe/client";
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
      cancelBilling: async (id) => {
        if (!billingEnabled()) return;
        const store = createBillingStore();
        const profile = await store.profileByUserId(id);
        await cancelAllSubscriptions({ store, gateway: getGateway() }, profile?.stripeCustomerId ?? null);
      },
      purgeStorage: (id) => purgeWardrobePrefix(admin, id),
      writeTombstone: writeProductionDeletionTombstone,
      deleteAuthUser: (id) => hardDeleteAuthUser(admin, id),
    },
  );
}
