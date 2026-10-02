import type { createClient } from "@/lib/supabase/server";
import type { Slot } from "@/lib/generator/types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
export const SAVED_PAGE = 30;
export type SavedLook = {
  id: string;
  lookName: string | null;
  occasion: string | null;
  date: string;
  savedAt: string;
  pieces: { itemId: string; slot: string; archived: boolean }[];
  layout?: { pieces?: { itemId: string; slot: Slot }[] };
};

/** Released looks stay in this collection; only unsaving removes them. */
export async function listSaved(supabase: ServerClient, userId: string, before?: string, beforeId?: string): Promise<{ looks: SavedLook[]; more: boolean }> {
  let query = supabase.from("outfits")
    .select("id, look_name, occasion, generated_on, trip_day, created_at, saved_at, layout, outfit_items(item_id, slot, items(archived))")
    .eq("user_id", userId).not("saved_at", "is", null);
  if (before) query = beforeId
    ? query.or(`saved_at.lt.${before},and(saved_at.eq.${before},id.lt.${beforeId})`)
    : query.lt("saved_at", before);
  const { data, error } = await query.order("saved_at", { ascending: false }).order("id", { ascending: false }).limit(SAVED_PAGE + 1);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    more: rows.length > SAVED_PAGE,
    looks: rows.slice(0, SAVED_PAGE).map(row => ({
      id: row.id, lookName: row.look_name, occasion: row.occasion,
      date: row.generated_on ?? row.trip_day ?? row.created_at.slice(0, 10), savedAt: row.saved_at,
      layout: row.layout as SavedLook["layout"],
      pieces: (row.outfit_items ?? []).map(link => {
        const item = Array.isArray(link.items) ? link.items[0] : link.items;
        return { itemId: link.item_id, slot: link.slot, archived: item?.archived === true };
      }),
    })),
  };
}

export async function countSaved(supabase: ServerClient, userId: string): Promise<number> {
  const { count, error } = await supabase.from("outfits").select("id", { count: "exact", head: true })
    .eq("user_id", userId).not("saved_at", "is", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
