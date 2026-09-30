import type { createClient } from "@/lib/supabase/server";
import { localDateFor } from "./local-date";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Today's looks were composed for the OLD city's weather, so a move invalidates
 * them. Decision 5 caches the drop; it does not make it correct for a different
 * climate — without this you land in Reykjavik and see outfits built for 26°C
 * Manila rain under a strip reading 12°C overcast.
 *
 * The rebuild is FREE, and that is not incidental: `generation_events` records
 * `kind` by whether a stored set already exists, so deleting the set is exactly
 * what makes the next call a `drop`. MONETISATION §2 — drops are never metered,
 * on any tier. The user changed a setting; they did not ask for a reroll.
 *
 * ⚠️ Keyed on the NEW timezone. Crossing zones can change what "today" is, and
 * deleting under the old key would destroy a past day's history while leaving
 * the row that is actually stale untouched — both intentions inverted.
 *
 * Shared by `setLocation` and `updateStyleProfile` (a changed no-go, band or archetype makes today's
 * looks just as stale as a changed city).
 */
export async function clearTodaysDrop(supabase: ServerClient, userId: string, timezone: string): Promise<void> {
  const today = localDateFor(new Date(), timezone);

  // Styled looks carry a weather snapshot too, and are cached per
  // (user, item, local day) — a look styled for Manila is as wrong as a drop is.
  const { data: rows, error: readError } = await supabase
    .from("outfits")
    .select("id")
    .eq("user_id", userId)
    .eq("generated_on", today);
  if (readError) throw new Error(readError.message);

  const ids = (rows ?? []).map((r) => r.id);
  if (!ids.length) return;

  // ⚠️ Errors are surfaced, not swallowed: a caller that reports "saved" while yesterday's looks survive has
  // told the user something false. `setLocation` keeps its old best-effort behaviour by catching this itself.
  //
  // Only `outfits` is deleted: `outfit_items.outfit_id` is ON DELETE CASCADE, so one statement removes the pieces
  // too. A separate `outfit_items` delete first left a window where an outfit survived WITHOUT its pieces.
  const outfits = await supabase.from("outfits").delete().in("id", ids);
  if (outfits.error) throw new Error(outfits.error.message);
}
