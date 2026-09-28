import { vocabLabel } from "@/lib/i18n/vocab-server";
import { Suspense } from "react";
import { Link, redirect } from "@/lib/i18n/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { CapsuleView } from "@/components/packing/capsule-view";
import { PackingBack } from "@/components/packing/back-link";
import { Shortfall } from "@/components/packing/shortfall";
import { loadTrip } from "@/lib/packing/store";
import { expandDays } from "@/lib/packing/plan";
import { fetchTripForecast } from "@/lib/weather/forecast";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDateRange, intlLocale } from "@/lib/i18n/format";
import type { ShippedLocale } from "@/lib/i18n/locales";

/**
 * The shell, and the `<Suspense>` fallback.
 *
 * ⚠️ **Only the back control**, because it is the only thing on this screen that
 * is not user data. The first version put a title here ("Your capsule") while
 * the body renders "Seven pieces." — so the title painted and then CHANGED, and
 * the back control painted and then vanished. Same mistake the Profile shell
 * made: a shell must contain what the body will show, or nothing.
 */
function TripShell() {
  return (
    <div className="screen-top px-[22px]">
      <PackingBack href="/packing" />
    </div>
  );
}

export default function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense fallback={<TripShell />}>
        <TripBody params={params} />
      </Suspense>
    </div>
  );
}

async function TripBody({ params }: { params: Promise<{ tripId: string }> }) {
  const tVocab = await getTranslations("vocab");
  const t = await getTranslations("packing");
  const locale = await getLocale();
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const trip = await loadTrip(tripId);
  if (!trip) notFound();

  const days = expandDays(trip.startDate, trip.endDate, trip.occasionMix);

  const { data: looks } = await supabase
    .from("outfits")
    .select("id, trip_day, occasion, look_name, ai_reasoning")
    .eq("trip_id", tripId)
    .order("trip_day");

  // The WHOLE closet, not just the capsule: a swap has to offer real
  // alternatives, and they are cutouts the sheet renders at thumbnail size.
  const { data: items } = await supabase
    .from("items")
    .select("id, name, subcategory, category, image_url, cutout_url, thumb_url")
    .eq("archived", false);

  const all = items ?? [];
  const inCapsule = new Set(trip.capsule.map((c) => c.itemId));
  const rows = all.filter((r) => inCapsule.has(r.id));
  // The capsule grid renders cutouts at ~110px — the thumbnail, not the hero.
  const path = (i: (typeof rows)[number]) => displayPath(i, "thumb");
  const signed = await signItemImages(all.map(path));

  const alternatives = all
    .filter((r) => !inCapsule.has(r.id))
    .map((r) => ({
      id: r.id,
      name: (r.name ?? r.subcategory ?? vocabLabel(tVocab, "category", r.category)) as string,
      category: r.category as string,
      imageUrl: signed.get(path(r)) ?? "",
    }));

  const pieces = trip.capsule.flatMap((c) => {
    const row = rows.find((r) => r.id === c.itemId);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: (row.name ?? row.subcategory ?? vocabLabel(tVocab, "category", row.category)) as string,
        imageUrl: signed.get(path(row)) ?? "",
        pinned: c.pinned,
        category: row.category as string,
      },
    ];
  });

  const covered = (looks ?? []).length;
  const range = formatRange(trip.startDate, trip.endDate, locale);
  const forecast = await fetchTripForecast(trip.lat, trip.lon, days.map((d) => d.date));

  // ⚠️ The shortfall branch. Reachable at an ordinary setting — "Fresh every
  // day" leaves 3 of 7 days uncovered on a 26-item closet — so it is the real
  // second half of this screen, not a defensive fallback.
  if (covered < days.length) {
    const uncoveredDays = days.filter((d) => !(looks ?? []).some((l) => l.trip_day === d.date));
    const byOccasion = new Map<string, string[]>();
    for (const d of uncoveredDays) {
      byOccasion.set(d.occasion, [...(byOccasion.get(d.occasion) ?? []), shortDay(d.date, locale)]);
    }

    return (
      <Shortfall
        destination={trip.destinationLabel}
        dateRange={range}
        gaps={[...byOccasion].map(([occasion, ds]) => ({ occasion, days: ds }))}
        coveredDays={covered}
        totalDays={days.length}
        pieceCount={pieces.length}
        why={
          (looks ?? [])[0]?.ai_reasoning ??
          t("shortfall.fallbackWhy")
        }
        onBuildPartial={
          covered > 0 ? (
            <Link
              href={`/packing/${tripId}/days`}
              className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
            >
              {t("shortfall.buildDays", { days: covered })}
            </Link>
          ) : (
            <Link
              href="/closet/upload"
              className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
            >
              {t("shortfall.addPiece")}
            </Link>
          )
        }
      />
    );
  }

  return (
    <CapsuleView
      tripId={tripId}
      destination={trip.destinationLabel}
      dateRange={range}
      pieces={pieces}
      dayCount={days.length}
      outfitCount={covered}
      why={(looks ?? [])[0]?.ai_reasoning ?? ""}
      /**
       * ⚠️ Was hard-coded `false`, so a trip past the forecast window silently
       * rendered a capsule built on the nearest real day's weather, PRESENTED
       * AS FACT. `mapTripForecast` had always set the flag correctly; only the
       * last hop was missing, and the copy for it was already on the screen.
       *
       * ⚠️ Not optional after the provider swap: One Call gives 10 days where
       * Open-Meteo gave 16, so every trip 11–16 days out moved from a real
       * forecast to a stand-in. This went from an edge case to an ordinary one.
       *
       * The read is served by the Postgres cache the planning step already
       * filled, so it costs a row rather than an API call.
       */
      beyondHorizon={forecast.beyondHorizon}
      alternatives={alternatives}
    />
  );
}

export function formatRange(start: string, end: string, locale: ShippedLocale = "en-GB"): string {
  return formatDateRange(start, end, locale);
}

function shortDay(date: string, locale: ShippedLocale): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
