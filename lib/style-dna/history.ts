import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** PostgREST returns at most `max_rows` (1000) rows per request, silently; a shorter page is the only proof of the end. */
const PAGE = 1000;
/** Worn outfit ids per `.in()` request: keeps the URL short and each look-piece page well under the row cap. */
const CHUNK = 100;

export async function readAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Every wear log, then only the worn outfits and their pieces, never every generated look (about 36 piece rows a day).
 * Wear logs and look pieces are read separately: a `wear_logs → outfit_items` embed returns zero rows silently (PR #22).
 */
export async function readWearHistory(supabase: Client, userId: string) {
  const logs = await readAll<{ outfit_id: string | null }>((from, to) =>
    supabase.from("wear_logs").select("id, outfit_id").eq("user_id", userId).order("id").range(from, to));
  const ids = [...new Set(logs.flatMap((log) => (log.outfit_id ? [log.outfit_id] : [])))].sort();
  const outfits: { id: string; occasion: string | null }[] = [];
  const pieces: { outfit_id: string; item_id: string }[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const [looks, links] = await Promise.all([
      readAll<{ id: string; occasion: string | null }>((from, to) =>
        supabase.from("outfits").select("id, occasion").eq("user_id", userId).in("id", chunk).order("id").range(from, to)),
      readAll<{ outfit_id: string; item_id: string }>((from, to) =>
        supabase.from("outfit_items").select("outfit_id, item_id").in("outfit_id", chunk).order("outfit_id").order("item_id").range(from, to)),
    ]);
    outfits.push(...looks);
    pieces.push(...links);
  }
  return { logs, outfits, pieces };
}
