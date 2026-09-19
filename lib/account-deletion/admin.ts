import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function deletionEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) throw new Error("Account deletion configuration is required");
  return value;
}

/** Creates a non-persisting service client scoped to the deletion workflow. */
export function createDeletionAdminClient(): SupabaseClient {
  const url = deletionEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = deletionEnvironment("SUPABASE_SERVICE_ROLE_KEY");

  try {
    return createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    throw new Error("Account deletion client creation failed");
  }
}

/** Hard-deletes an Auth account only after the caller completed every purge stage. */
export async function hardDeleteAuthUser(client: SupabaseClient, userId: string): Promise<void> {
  try {
    const { error } = await client.auth.admin.deleteUser(userId, false);
    if (error) throw new Error();
  } catch {
    throw new Error("Auth user deletion failed");
  }
}
