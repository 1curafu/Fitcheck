import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { localDateFor } from "@/lib/outfits/local-date";
import { buildMonth, monthLabel, type DayLog } from "@/lib/diary/month";
import { currentStreak } from "@/lib/diary/streak";
import { thumbnailPieces } from "@/lib/diary/thumbnail";
import { parseMonth, monthBounds, shiftMonth, latestPerDay } from "@/lib/diary/logs";
import { DiaryGrid } from "@/components/diary/diary-grid";
import { MobileNav } from "@/components/shell/mobile-nav";

type ItemRow = { category: string; image_url: string; cutout_url: string | null };

/**
 * The Fit Diary — a month of what was actually worn.
 *
 * A pure VIEW over `wear_logs`: it writes nothing. Everything on this screen
 * arrives via the "Wear this today" button on an outfit.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("location_timezone")
    .eq("id", user.id)
    .single();
  const today = localDateFor(new Date(), profile?.location_timezone ?? "UTC");

  const { year, month } = parseMonth(m, today);
  const { start, end } = monthBounds(year, month);

  /**
   * Two reads, deliberately.
   *
   * The streak is "as of today" and is computed from ALL of the user's wear
   * dates — deriving it from the visible month would make it shrink as you page
   * backwards, measuring the view instead of the habit. The grid only needs the
   * month on screen.
   */
  const [{ data: allDates }, { data: monthRows }] = await Promise.all([
    supabase.from("wear_logs").select("worn_on").eq("user_id", user.id),
    supabase
      .from("wear_logs")
      .select("worn_on, outfit_id, created_at")
      .eq("user_id", user.id)
      .gte("worn_on", start)
      .lte("worn_on", end),
  ]);

  const days = latestPerDay(monthRows ?? []);
  const outfitIds = days.map((d) => d.outfit_id).filter((id): id is string => Boolean(id));

  /**
   * `wear_logs` and `outfit_items` are NOT directly related — both hang off
   * `outfits` — so PostgREST cannot embed one in the other. That is the trap
   * which silently returned zero rows for per-item wear counts; two explicit
   * queries are obviously correct where the embed was quietly wrong.
   */
  const { data: links } = outfitIds.length
    ? await supabase
        .from("outfit_items")
        .select("outfit_id, items(category, image_url, cutout_url)")
        .in("outfit_id", outfitIds)
    : { data: [] };

  const piecesByOutfit = new Map<string, ItemRow[]>();
  for (const l of links ?? []) {
    const item = (Array.isArray(l.items) ? l.items[0] : l.items) as ItemRow | null;
    if (!item) continue;
    const held = piecesByOutfit.get(l.outfit_id) ?? [];
    held.push(item);
    piecesByOutfit.set(l.outfit_id, held);
  }

  // One signing round-trip for the whole month, not one per day.
  const signed = await signItemImages([...piecesByOutfit.values()].flat().map(displayPath));

  const logs: DayLog[] = days.map((d) => ({
    worn_on: d.worn_on,
    outfitId: d.outfit_id,
    pieces: thumbnailPieces(
      (piecesByOutfit.get(d.outfit_id ?? "") ?? []).map((i) => ({
        category: i.category,
        imageUrl: signed.get(displayPath(i)) ?? "",
      })),
    ),
  }));

  return (
    <>
      <DiaryGrid
        cells={buildMonth(year, month, today, logs)}
        monthLabel={monthLabel(year, month)}
        streak={currentStreak(
          (allDates ?? []).map((r) => r.worn_on),
          today,
        )}
        prevHref={`/calendar?m=${shiftMonth(year, month, -1)}`}
        nextHref={`/calendar?m=${shiftMonth(year, month, 1)}`}
      />
      <MobileNav />
    </>
  );
}
