import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Release saved looks and delete the rest in one locked transaction (a concurrent save cannot land between). */
export async function releaseSavedThenDelete(supabase: ServerClient, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.rpc("release_saved_then_delete", { p_ids: ids });
  if (error) throw new Error(error.message);
}
