import { createClient } from "@/lib/supabase/server";
import type { LookDraft, WeatherPayload } from "@/lib/generator/types";

/**
 * The cache read for "Style an outfit with this".
 *
 * `outfits_styled_unique (user_id, styled_item_id, generated_on)` means there is
 * at most one row per piece per local day, so this is the whole cache: a hit
 * costs one indexed lookup and NO model call.
 */
export async function loadStyledLook(
  userId: string,
  itemId: string,
  generatedOn: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    .select("id")
    .eq("user_id", userId)
    .eq("styled_item_id", itemId)
    .eq("generated_on", generatedOn)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Persist a styled look and return its id.
 *
 * `look_index` is deliberately left NULL: `outfits_daily_unique` covers
 * (user_id, occasion, generated_on, look_index), and Postgres treats NULLs as
 * distinct, so two pieces styled on the same day for the same occasion cannot
 * collide. `loadDailyLooks`/`saveDailyLooks` filter these rows out entirely.
 */
export async function saveStyledLook(
  userId: string,
  itemId: string,
  occasion: string,
  generatedOn: string,
  weather: WeatherPayload,
  look: LookDraft,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("outfits")
    .insert({
      user_id: userId,
      occasion,
      generated_on: generatedOn,
      styled_item_id: itemId,
      look_name: look.name,
      ai_reasoning: look.why,
      weather_snapshot: weather,
      layout: {
        anchorIndex: look.anchorIndex,
        pieces: look.pieces.map((p) => ({ itemId: p.itemId, slot: p.slot })),
      },
    })
    .select("id")
    .single();
  if (!row) return null;

  const links = look.pieces.map((p) => ({
    outfit_id: row.id,
    item_id: p.itemId,
    slot: p.category,
  }));
  if (links.length) await supabase.from("outfit_items").insert(links);

  return row.id;
}
