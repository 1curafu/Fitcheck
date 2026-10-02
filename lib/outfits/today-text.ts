import "server-only";
import type { ShippedLocale } from "@/lib/i18n/locales";
import { localDateFor } from "./local-date";
import { ensureOutfitTexts, type TextClient } from "./text-store";

/** Today's daily drop first; recent styled looks fill the remaining capacity. */
export async function todayTranslationIds(client: TextClient, userId: string, timeZone: string, now: Date): Promise<string[]> {
  const today = localDateFor(now, timeZone);
  const daily = await client.from("outfits").select("id")
    .eq("user_id", userId).eq("generated_on", today).is("trip_id", null).is("released_at", null)
    .is("styled_item_id", null).order("look_index", { ascending: true }).limit(12);
  if (daily.error) throw new Error("Today look read failed");
  const ids = [...new Set((daily.data ?? []).map(row => row.id as string))].slice(0, 12);
  if (ids.length === 12) return ids;
  const styled = await client.from("outfits").select("id")
    .eq("user_id", userId).eq("generated_on", today).is("trip_id", null).is("released_at", null)
    .not("styled_item_id", "is", null).order("created_at", { ascending: false }).limit(12 - ids.length);
  if (styled.error) throw new Error("Today look read failed");
  return [...new Set([...ids, ...(styled.data ?? []).map(row => row.id as string)])].slice(0, 12);
}

/** Captured request authority only; every batch still claims the shared budget. */
export async function prewarmTodayTexts(client: TextClient, userId: string, locale: ShippedLocale, timeZone: string): Promise<void> {
  const ids = await todayTranslationIds(client, userId, timeZone, new Date());
  for (let index = 0; index < ids.length; index += 6) {
    await ensureOutfitTexts(client, ids.slice(index, index + 6), locale);
  }
}
