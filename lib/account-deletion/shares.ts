import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REMOVE_BATCH_SIZE = 100;

async function listShareObjects(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client.rpc("share_object_names", { p_user: userId });
  if (error || !Array.isArray(data)) throw new Error("Shares listing failed");
  return data as string[];
}

/** Every share image the user uploaded, found by owner_id (a mid-deletion share has no row left), then verified gone. */
export async function purgeShareObjects(client: SupabaseClient, userId: string): Promise<void> {
  if (!UUID.test(userId)) throw new Error("Invalid deletion user ID");
  const names = await listShareObjects(client, userId);
  const bucket = client.storage.from("shares");
  for (let i = 0; i < names.length; i += REMOVE_BATCH_SIZE) {
    const { error } = await bucket.remove(names.slice(i, i + REMOVE_BATCH_SIZE));
    if (error) throw new Error("Shares removal failed");
  }
  if ((await listShareObjects(client, userId)).length > 0) throw new Error("Shares verification failed");
}
