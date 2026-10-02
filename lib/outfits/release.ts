import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Retain saved history outside its set; a failed release stops deletion. */
export async function releaseSavedThenDelete(supabase: ServerClient, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const released = await supabase.from("outfits")
    .update({ released_at: new Date().toISOString(), look_index: null, styled_index: null })
    .in("id", ids).not("saved_at", "is", null);
  if (released.error) throw new Error(released.error.message);
  const deleted = await supabase.from("outfits").delete().in("id", ids).is("saved_at", null);
  if (deleted.error) throw new Error(deleted.error.message);
}
