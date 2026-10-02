import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import type { LookDraft, WeatherPayload } from "@/lib/generator/types";
import { storedLooksBlocked, type NoGo, type NoGoItem } from "@/lib/generator/nogos";
import { releaseSavedThenDelete } from "./release";

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
  const { data, error } = await supabase
    .from("outfits")
    .select("id, styled_index")
    .eq("user_id", userId)
    .eq("styled_item_id", itemId)
    .eq("generated_on", generatedOn)
    .is("released_at", null)
    .order("styled_index", { ascending: true, nullsFirst: true });
  if (error) throw new Error(error.message);
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
 * the new set. Saved rows are released; unsaved pieces cascade with their look.
 */
export async function clearStyledLooks(
  userId: string,
  itemId: string,
  generatedOn: string,
): Promise<void> {
  const supabase = await createClient();
  const ids = await loadStyledLooks(userId, itemId, generatedOn);
  if (!ids.length) return;
  await releaseSavedThenDelete(supabase, ids);
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
  sourceLocale: Locale = DEFAULT_LOCALE,
): Promise<string[]> {
  const ids: string[] = [];
  for (const [i, look] of looks.entries()) {
    const id = await saveOne(userId, itemId, occasion, generatedOn, weather, look, i, sourceLocale);
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
  sourceLocale: Locale,
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
      text_locale: sourceLocale,
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

/**
 * Does a CACHED styled set break the user's no-gos? A cached set is served without rebuilding, so a companion retagged
 * Ripped/Large/Fitted after styling would otherwise stay in the look all day. The styled piece itself is exempt (the
 * user chose it); a blocked companion, or double denim, is not.
 *
 * ⚠️ FAIL CLOSED: a failed read of the cached pieces THROWS. It must never read as "nothing to check" — with the error
 * dropped, every cached look looked empty, the check passed, and unchecked looks were served (review finding on the
 * 0.6.0 release PR). The caller's catch turns the throw into the ordinary "couldn't style this" state.
 */
export async function styledCacheBreaksNogo(
  outfitIds: readonly string[],
  items: readonly (NoGoItem & { id: string })[],
  nogos: readonly NoGo[],
  styledItemId: string,
): Promise<boolean> {
  if (!outfitIds.length || !nogos.length) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.from("outfit_items").select("outfit_id, item_id").in("outfit_id", [...outfitIds]);
  if (error) throw new Error(error.message);
  const looks = outfitIds.map((id) => ({
    pieces: (data ?? []).filter((r) => r.outfit_id === id).map((r) => ({ itemId: r.item_id as string })),
  }));
  return storedLooksBlocked(looks, new Map(items.map((i) => [i.id, i])), nogos, [styledItemId]);
}
