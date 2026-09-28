import { vocabLabel } from "@/lib/i18n/vocab-server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { MobileNav } from "@/components/shell/mobile-nav";
import { DayList, type DayCard } from "@/components/packing/day-list";
import { PackingBack } from "@/components/packing/back-link";
import { loadTrip } from "@/lib/packing/store";
import { fetchTripForecast } from "@/lib/weather/forecast";
import { formatRange } from "../page";
import { redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocale } from "@/lib/i18n/format";
import { readPreferences } from "@/lib/profile/preferences";
import { readOutfitTexts } from "@/lib/outfits/text-store";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Only the back control — see the note in the capsule route's shell.
 *
 * ⚠️ It points at `/packing`, not at this trip, because the shell CANNOT know
 * the trip id: `params` is runtime data under Cache Components, and awaiting it
 * in the page makes the whole route dynamic (the build says so plainly). The
 * body's control looks identical and sits in the same place, so nothing moves;
 * only the href differs, and the browser's own back still returns to the capsule.
 */
function DaysShell() {
  return (
    <div className="screen-top px-[22px]">
      <PackingBack href="/packing" />
    </div>
  );
}

export default function DaysPage({ params }: { params: Promise<{ tripId: string }> }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense fallback={<DaysShell />}>
        <DaysBody params={params} />
      </Suspense>
      {/* ⚠️ Its own boundary. `MobileNav` calls `usePathname()`, and on a
          DYNAMIC route the path is not known at prerender time — the build
          fails outright with "URL data in a Client Component outside of
          <Suspense>". The tab destinations get away with rendering it bare
          because their paths are static. */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  );
}

async function DaysBody({ params }: { params: Promise<{ tripId: string }> }) {
  const tVocab = await getTranslations("vocab");
  const locale = await getLocale();
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const trip = await loadTrip(tripId);
  if (!trip) notFound();

  const { data: looks } = await supabase
    .from("outfits")
    .select("id, trip_day, occasion, look_name, ai_reasoning, text_locale, outfit_items(item_id)")
    .eq("trip_id", tripId)
    .order("trip_day");

  const rows = looks ?? [];
  const texts = await readOutfitTexts(supabase, rows.map(row => ({ id: row.id, sourceLocale: row.text_locale as Locale,
    name: row.look_name ?? "", why: row.ai_reasoning })), locale);
  const itemIds = [...new Set(rows.flatMap((l) => (l.outfit_items ?? []).map((oi) => oi.item_id)))];

  const { data: items } = await supabase
    .from("items")
    .select("id, name, subcategory, category, image_url, cutout_url, thumb_url")
    .in("id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"]);

  const itemRows = items ?? [];
  // Day cards render four cutouts at ~90px — the thumbnail, not the hero.
  const path = (i: (typeof itemRows)[number]) => displayPath(i, "thumb");
  const signed = await signItemImages(itemRows.map(path));

  const forecast = await fetchTripForecast(
    trip.lat,
    trip.lon,
    rows.map((l) => l.trip_day as string),
  );

  const { data: prefs } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle();

  // ⚠️ Wear numbers are computed across the WHOLE trip in date order, not per
  // card — "2nd wear" is only true relative to everything worn before it.
  const seen = new Map<string, number>();

  const days: DayCard[] = rows.map((l, index) => {
    const date = l.trip_day as string;
    const w = forecast.byDate[date];
    const pieces = (l.outfit_items ?? []).flatMap((oi) => {
      const row = itemRows.find((r) => r.id === oi.item_id);
      if (!row) return [];
      const wear = (seen.get(row.id) ?? 0) + 1;
      seen.set(row.id, wear);
      return [
        {
          id: row.id,
          name: (row.name ?? row.subcategory ?? vocabLabel(tVocab, "category", row.category)) as string,
          imageUrl: signed.get(path(row)) ?? "",
          wear,
        },
      ];
    });

    return {
      outfitId: l.id as string,
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
        weekday: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      occasion: l.occasion as string,
      tempC: w?.tempC ?? 15,
      rain: w?.rain ?? false,
      text: texts[index],
      pieces,
    };
  });

  return (
    <DayList
      destination={trip.destinationLabel}
      dateRange={formatRange(trip.startDate, trip.endDate, locale)}
      days={days}
      unit={readPreferences(prefs?.preferences).tempUnit}
      backHref={`/packing/${tripId}`}
    />
  );
}
