import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { CapsuleView } from "@/components/packing/capsule-view";
import { PackingBack } from "@/components/packing/back-link";
import { Shortfall } from "@/components/packing/shortfall";
import { loadTrip } from "@/lib/packing/store";
import { expandDays } from "@/lib/packing/plan";

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
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const trip = await loadTrip(tripId);
  if (!trip) notFound();

  const days = expandDays(trip.startDate, trip.endDate, trip.occasionMix);

  const { data: looks } = await supabase
    .from("outfits")
    .select("id, trip_day, occasion, look_name, ai_reasoning")
    .eq("trip_id", tripId)
    .order("trip_day");

  const { data: items } = await supabase
    .from("items")
    .select("id, name, subcategory, category, image_url, cutout_url, thumb_url")
    .in("id", trip.capsule.length ? trip.capsule.map((c) => c.itemId) : ["00000000-0000-0000-0000-000000000000"]);

  const rows = items ?? [];
  // The capsule grid renders cutouts at ~110px — the thumbnail, not the hero.
  const path = (i: (typeof rows)[number]) => displayPath(i, "thumb");
  const signed = await signItemImages(rows.map(path));

  const pieces = trip.capsule.flatMap((c) => {
    const row = rows.find((r) => r.id === c.itemId);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: (row.name ?? row.subcategory ?? row.category) as string,
        imageUrl: signed.get(path(row)) ?? "",
      },
    ];
  });

  const covered = (looks ?? []).length;
  const range = formatRange(trip.startDate, trip.endDate);

  // ⚠️ The shortfall branch. Reachable at an ordinary setting — "Fresh every
  // day" leaves 3 of 7 days uncovered on a 26-item closet — so it is the real
  // second half of this screen, not a defensive fallback.
  if (covered < days.length) {
    const uncoveredDays = days.filter((d) => !(looks ?? []).some((l) => l.trip_day === d.date));
    const byOccasion = new Map<string, string[]>();
    for (const d of uncoveredDays) {
      byOccasion.set(d.occasion, [...(byOccasion.get(d.occasion) ?? []), shortDay(d.date)]);
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
          "Pack the days I can dress properly and keep the rest open — borrowed beats a bad substitute."
        }
        onBuildPartial={
          covered > 0 ? (
            <Link
              href={`/packing/${tripId}/days`}
              className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
            >
              Build the {covered} days
            </Link>
          ) : (
            <Link
              href="/closet/upload"
              className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
            >
              Add a piece
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
      beyondHorizon={false}
    />
  );
}

/** "12–18 May" — one month named once. */
export function formatRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  const day = (d: Date) => d.getUTCDate();
  return month(a) === month(b)
    ? `${day(a)}–${day(b)} ${month(b)}`
    : `${day(a)} ${month(a)} – ${day(b)} ${month(b)}`;
}

function shortDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
