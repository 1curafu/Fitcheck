import { createClient } from "@/lib/supabase/server";
import type { LookDraft, WeatherPayload } from "@/lib/generator/types";

/**
 * The cache read for "Style an outfit with this".
 *
 * `outfits_styled_unique (user_id, styled_item_id, generated_on, styled_index)`
 * scopes the set to one piece per local day, so this is the whole cache: a hit
 * costs one indexed lookup and NO model call.
 *
 * Ordered by `styled_index`, which is the set's own ordinal — NOT `look_index`,
 * which styled rows keep NULL so they cannot collide with the daily drop's
 * unique index. `nullsFirst` so a row written before the set existed (index
 * NULL) still reads as the first look rather than vanishing off the end.
 */
export async function loadStyledLooks(
  userId: string,
  itemId: string,
  generatedOn: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    .select("id, styled_index")
    .eq("user_id", userId)
    .eq("styled_item_id", itemId)
    .eq("generated_on", generatedOn)
    .order("styled_index", { ascending: true, nullsFirst: true });
  return (data ?? []).map((r) => r.id);
}

/**
 * Which pieces the user has already been shown for this styling today.
 *
 * Feeds `Ctx.recentlyShown` on a "try another", so the next set sinks what was
 * just rejected instead of returning it again — the PR #15 bug, in the styled
 * path. A soft penalty, never a filter.
 */
export async function loadStyledPieceIds(
  userId: string,
  itemId: string,
  generatedOn: string,
): Promise<string[]> {
  const ids = await loadStyledLooks(userId, itemId, generatedOn);
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("outfit_items").select("item_id").in("outfit_id", ids);
  return (data ?? []).map((r) => r.item_id);
}

/**
 * Drop a piece's styled set for the day.
 *
 * Delete-then-insert, for the same reason `saveDailyLooks` does it: a fresh run
 * may return a different number of looks, and leftovers must not survive beside
 * the new set. `outfit_items` first — the rows hang off `outfits`.
 */
export async function clearStyledLooks(
  userId: string,
  itemId: string,
  generatedOn: string,
): Promise<void> {
  const supabase = await createClient();
  const ids = await loadStyledLooks(userId, itemId, generatedOn);
  if (!ids.length) return;
  await supabase.from("outfit_items").delete().in("outfit_id", ids);
  await supabase.from("outfits").delete().in("id", ids);
}

/**
 * Persist a styled SET and return the ids, in order.
 *
 * `look_index` is deliberately left NULL: `outfits_daily_unique` covers
 * (user_id, occasion, generated_on, look_index), and Postgres treats NULLs as
 * distinct, so two pieces styled on the same day for the same occasion cannot
 * collide. The set's own order lives in `styled_index`.
 * `loadDailyLooks`/`saveDailyLooks` filter these rows out entirely.
 */
export async function saveStyledLooks(
  userId: string,
  itemId: string,
  occasion: string,
  generatedOn: string,
  weather: WeatherPayload,
  looks: LookDraft[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, look] of looks.entries()) {
    const id = await saveOne(userId, itemId, occasion, generatedOn, weather, look, i);
    if (id) ids.push(id);
  }
  return ids;
}

async function saveOne(
  userId: string,
  itemId: string,
  occasion: string,
  generatedOn: string,
  weather: WeatherPayload,
  look: LookDraft,
  styledIndex: number,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("outfits")
    .insert({
      user_id: userId,
      occasion,
      generated_on: generatedOn,
      styled_item_id: itemId,
      styled_index: styledIndex,
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
