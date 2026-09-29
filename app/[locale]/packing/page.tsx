import { Suspense } from "react";
import { Link, redirect } from "@/lib/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "@/components/packing/back-link";
import { listTrips } from "@/lib/packing/store";
import { formatDateRange } from "@/lib/i18n/format";

/**
 * The shell: the header, identical for every user, in the place the body puts
 * it — so nothing moves when the trips arrive.
 */
function TripsShell({ mode, title }: { mode: string; title: string }) {
  return (
    <div className="screen-top px-[22px]">
      <PackingBack href="/profile" />
      <span className="mt-[10px] block text-[11px] uppercase tracking-[0.22em] text-muted-dim">
        {mode}
      </span>
      <h1 className="mt-[13px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong">
        {title}
      </h1>
    </div>
  );
}

export default async function TripsPage() {
  const t = await getTranslations("packing");
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Suspense fallback={<TripsShell mode={t("mode")} title={t("yourTrips")} />}>
        <TripsBody />
      </Suspense>
    </div>
  );
}

async function TripsBody() {
  const t = await getTranslations("packing");
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: "/", locale: await getLocale() });

  const trips = await listTrips();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <TripsShell mode={t("mode")} title={t("yourTrips")} />

      <div className="flex-1 px-[22px] pb-[112px]">
        {trips.length === 0 ? (
          <p className="mt-6 text-[15.5px] leading-[1.45] text-muted-foreground text-pretty">
            {t("emptyTrips")}
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-[10px]">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/packing/${trip.id}`}
                className="block rounded-[16px] bg-surface-1 px-4 py-[15px] shadow-[inset_0_0_0_1px_var(--hairline-3)]"
              >
                <Kicker className="block">{formatDateRange(trip.startDate, trip.endDate, locale)}</Kicker>
                <div className="mt-[6px] font-serif text-[20px]/[1.2] text-foreground">
                  {trip.destinationLabel}
                </div>
                <div className="mt-[6px] text-[13px] text-muted-foreground">
                  {t("tripCounts", { pieces: trip.pieceCount, days: trip.dayCount })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <Link
          href="/packing/new"
          className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
        >
            {trips.length === 0 ? t("planTrip") : t("planAnother")}
        </Link>
      </div>
    </div>
  );
}
