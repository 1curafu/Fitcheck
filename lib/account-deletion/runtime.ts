import "server-only";

import { createBillingStore } from "@/lib/billing/admin";
import { cancelAllSubscriptions } from "@/lib/billing/stripe/cancel";
import { getGateway } from "@/lib/billing/stripe/client";
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
        // Fail CLOSED (review C1): whether billing is configured right now says nothing about whether this user pays.
        // A user with a Stripe customer must be cancelled; if Stripe can't be reached, getGateway() throws and the
        // deletion stops at `billing` before anything is destroyed.
        const store = createBillingStore();
        const profile = await store.profileByUserId(id);
        if (!profile?.stripeCustomerId) return;
        await cancelAllSubscriptions({ store, gateway: getGateway() }, profile.stripeCustomerId);
      },
      purgeStorage: (id) => purgeWardrobePrefix(admin, id),
      writeTombstone: writeProductionDeletionTombstone,
      deleteAuthUser: (id) => hardDeleteAuthUser(admin, id),
    },
  );
}
