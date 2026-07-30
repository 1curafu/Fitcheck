import { createClient } from "@/lib/supabase/server";
import type { LookDraft, WeatherPayload } from "@/lib/generator/types";
import type { StoredLook } from "./reassemble";
import { freshIndexStart, isWornToday } from "./wear";

/** Today's stored set for one occasion, in the order the stylist chose. */
export async function loadDailyLooks(
  userId: string,
  occasion: string,
  generatedOn: string,
): Promise<StoredLook[] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    // `wear_logs(worn_on)` is the reverse of wear_logs.outfit_id. A look the
    // user has already worn today stays in the set and is badged, rather than
    // disappearing the moment they tap the button.
    .select("id, look_name, ai_reasoning, layout, look_index, wear_logs(worn_on)")
    .eq("user_id", userId)
    .eq("occasion", occasion)
    .eq("generated_on", generatedOn)
    .order("look_index", { ascending: true });

  if (!data || data.length === 0) return null;

  return data.map((row) => {
    const layout = (row.layout ?? {}) as {
      anchorIndex?: number;
      pieces?: StoredLook["pieces"];
    };
    return {
      id: row.id,
      lookName: row.look_name ?? "",
      why: row.ai_reasoning ?? "",
      anchorIndex: layout.anchorIndex ?? 0,
      pieces: layout.pieces ?? [],
      worn: isWornToday(row.wear_logs ?? [], generatedOn),
    };
  });
}

/**
 * Replace today's set for one occasion. Delete-then-insert rather than upsert:
 * a regenerate may return a different NUMBER of looks, and leftovers from the
 * previous set must not survive alongside the new one.
 *
 * One exception, and it is the reason this function can be called at all after
 * a wear: an outfit with a wear log is PINNED. `wear_logs.outfit_id` used to
 * have no ON DELETE action, so deleting a worn outfit raised a foreign-key
 * violation and the whole regeneration failed. Pinning is also the honest
 * product behaviour — what you actually wore today is not a suggestion to be
 * thrown away, so it keeps its place in the day's set and the fresh looks are
 * numbered past it (`outfits_daily_unique` covers `look_index`).
 *
 * Returns the new outfit ids, aligned with the `looks` array.
 */
export async function saveDailyLooks(
  userId: string,
  occasion: string,
  generatedOn: string,
  weather: WeatherPayload,
  looks: LookDraft[],
): Promise<string[]> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("outfits")
    .select("id, look_index, wear_logs(worn_on)")
    .eq("user_id", userId)
    .eq("occasion", occasion)
    .eq("generated_on", generatedOn);

  // Any wear log pins the row — not just today's. The point is that nothing
  // referenced by wear_logs is ever deleted here.
  const pinned = (existing ?? []).filter((r) => (r.wear_logs ?? []).length > 0);

  let del = supabase
    .from("outfits")
    .delete()
    .eq("user_id", userId)
    .eq("occasion", occasion)
    .eq("generated_on", generatedOn);
  if (pinned.length) del = del.not("id", "in", `(${pinned.map((r) => r.id).join(",")})`);
  await del;

  const start = freshIndexStart(pinned.map((r) => r.look_index));
  const rows = looks.map((look, i) => ({
    user_id: userId,
    occasion,
    generated_on: generatedOn,
    look_index: start + i,
    look_name: look.name,
    ai_reasoning: look.why,
    weather_snapshot: weather,
    layout: {
      anchorIndex: look.anchorIndex,
      pieces: look.pieces.map((p) => ({ itemId: p.itemId, slot: p.slot })),
    },
  }));

  const { data: inserted } = await supabase
    .from("outfits")
    .insert(rows)
    .select("id, look_index");
  if (!inserted) return [];

  // outfit_items is the relational record — it is what wear_logs and future
  // analytics join against. The renderable geometry lives in outfits.layout.
  const links = inserted.flatMap((row) => {
    const look = looks[row.look_index - start];
    return (look?.pieces ?? []).map((p) => ({
      outfit_id: row.id,
      item_id: p.itemId,
      slot: p.category,
    }));
  });
  if (links.length) await supabase.from("outfit_items").insert(links);

  // Insert order is not guaranteed — place each id at its look's position.
  const ids: string[] = [];
  for (const row of inserted) ids[row.look_index - start] = row.id;
  return ids;
}
