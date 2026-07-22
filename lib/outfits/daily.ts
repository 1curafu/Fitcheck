import { createClient } from "@/lib/supabase/server";
import type { Look, WeatherPayload } from "@/lib/generator/types";
import type { StoredLook } from "./reassemble";

/** Today's stored set for one occasion, in the order the stylist chose. */
export async function loadDailyLooks(
  userId: string,
  occasion: string,
  generatedOn: string,
): Promise<StoredLook[] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    .select("look_name, ai_reasoning, layout, look_index")
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
      lookName: row.look_name ?? "",
      why: row.ai_reasoning ?? "",
      anchorIndex: layout.anchorIndex ?? 0,
      pieces: layout.pieces ?? [],
    };
  });
}

/**
 * Replace today's set for one occasion. Delete-then-insert rather than upsert:
 * a regenerate may return a different NUMBER of looks, and leftovers from the
 * previous set must not survive alongside the new one.
 */
export async function saveDailyLooks(
  userId: string,
  occasion: string,
  generatedOn: string,
  weather: WeatherPayload,
  looks: Look[],
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("outfits")
    .delete()
    .eq("user_id", userId)
    .eq("occasion", occasion)
    .eq("generated_on", generatedOn);

  const rows = looks.map((look, i) => ({
    user_id: userId,
    occasion,
    generated_on: generatedOn,
    look_index: i,
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
  if (!inserted) return;

  // outfit_items is the relational record — it is what wear_logs and future
  // analytics join against. The renderable geometry lives in outfits.layout.
  const links = inserted.flatMap((row) => {
    const look = looks[row.look_index];
    return (look?.pieces ?? []).map((p) => ({
      outfit_id: row.id,
      item_id: p.itemId,
      slot: p.category,
    }));
  });
  if (links.length) await supabase.from("outfit_items").insert(links);
}
