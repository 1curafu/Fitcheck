"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";

import { useEffect, useState, useTransition } from "react";

import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "./back-link";
import { REWEAR_LEVELS } from "@/lib/packing/rewear";
import { useLocationPicker } from "@/lib/weather/use-location-picker";
import { LocationSheet } from "@/components/weather/location-sheet";
import type { City } from "@/lib/weather/geocode";
import { planTrip } from "@/app/[locale]/packing/actions";
import { PackingLockedError } from "@/lib/packing/errors";

/** The product's four occasions. A fifth is never invented here. */
const OCCASIONS = ["work", "everyday", "evening", "weekend"] as const;

export type TripSetupProps = {
  destinationLabel: string;
  lat: number;
  lon: number;
  timezone: string;
};

export function TripSetup({ destinationLabel, lat, lon, timezone }: TripSetupProps) {
  const t = useTranslations("packing");
  const locationT = useTranslations("weather");
  const tOccasion = useTranslations("vocab.occasion");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [mix, setMix] = useState<Record<string, number>>({ work: 0, everyday: 0, evening: 0, weekend: 0 });
  const [level, setLevel] = useState(3);

  /**
   * ⚠️ The SAME picker Settings and the Stylist's weather pill use — one
   * component, so the three screens cannot drift into offering different ways
   * to choose a place. The destination is a real choice here, not a display of
   * the user's home city: a trip is somewhere else by definition.
   */
  const [destination, setDestination] = useState({
    label: destinationLabel,
    lat,
    lon,
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  function pickCity(c: City) {
    setDestination({ label: c.name, lat: c.lat, lon: c.lon });
    setPickerOpen(false);
  }

  const picker = useLocationPicker({
    onPick: (p) => pickCity({ name: p.label, country: "", lat: p.lat, lon: p.lon }),
  });

  /**
   * ⚠️ Close the sheet on unmount. Routes are preserved with React
   * `<Activity hidden>` under Cache Components rather than unmounted, so
   * `useState` survives navigation — leave with the sheet open and it is still
   * open when you come back. Four sheets needed this fix on PR #42-#45; the
   * same rule applies to every new one.
   */
  useEffect(() => () => setPickerOpen(false), []);

  const dayCount = countDays(startDate, endDate);
  const assigned = Object.values(mix).reduce((a, b) => a + b, 0);

  function bump(key: string, delta: number) {
    setMix((m) => {
      const next = Math.max(0, (m[key] ?? 0) + delta);
      // The mix can never claim more days than the trip has — the steppers stop
      // rather than letting the user build a mix `expandDays` would truncate.
      if (delta > 0 && assigned >= dayCount) return m;
      return { ...m, [key]: next };
    });
  }

  function submit() {
    setError(null);
    start(async () => {
      try {
        const { tripId } = await planTrip({
          destinationLabel: destination.label,
          lat: destination.lat,
          lon: destination.lon,
          timezone,
          startDate,
          endDate,
          occasionMix: mix,
          rewearLevel: level,
        });
        router.push(`/packing/${tripId}`);
      } catch (e) {
        setError(
          e instanceof PackingLockedError || (e as Error)?.message?.includes("packing.proRequired")
            ? t("proRequired")
            : (e as Error)?.message === "packing.invalidDateRange" ? t("invalidDateRange") : t("planFailed"),
        );
      }
    });
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top flex-1 px-[22px] pb-[112px]">
        {/* ⚠️ The same header the shell renders, in the same place. A shell that
            shows a back control the body then drops makes it VANISH — the
            Profile mistake. */}
        <PackingBack href="/packing" />
        <Kicker className="mt-[10px] block">{t("mode")}</Kicker>
        <h1 className="mt-[13px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong">
          {t("newTitle")}
        </h1>

        {/* The location picker is SHARED with Settings and the Stylist's weather
            pill — one component, so the three screens cannot drift into offering
            different ways to change the same setting. */}
        <div className="mt-[22px] overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-3)]">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-[56px] w-full items-center gap-[13px] border-b border-[var(--hairline-3)] p-4 text-left"
          >
            <span className="flex-1 text-sm text-muted-foreground">{t("destination")}</span>
            <span className="text-base text-value">{destination.label === "Current location" ? locationT("currentLocation") : destination.label}</span>
            <span aria-hidden="true" className="text-[18px] text-muted-dim">
              ›
            </span>
          </button>
          <label className="flex min-h-[56px] items-center gap-[13px] p-4">
            <span className="flex-1 text-sm text-muted-foreground">{t("from")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-base text-value outline-none"
            />
          </label>
          <label className="flex min-h-[56px] items-center gap-[13px] border-t border-[var(--hairline-3)] p-4">
            <span className="flex-1 text-sm text-muted-foreground">{t("to")}</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-base text-value outline-none"
            />
          </label>
        </div>

        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <Kicker>{t("occasionMix")}</Kicker>
          <span className={`text-[13px] ${assigned === dayCount ? "text-brand-high" : "text-muted-foreground"}`}>
            {t("mixCount", { assigned, days: dayCount })}
          </span>
        </div>
        <div className="overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-3)]">
          {OCCASIONS.map((o, i) => (
            <div
              key={o}
              className={`flex min-h-[56px] items-center gap-[10px] py-[9px] pl-4 pr-3 ${
                i < OCCASIONS.length - 1 ? "border-b border-[var(--hairline-3)]" : ""
              }`}
            >
              <div className="flex-1 text-base text-foreground">{tOccasion(o)}</div>
              <button
                type="button"
                aria-label={t("fewerDay", { occasion: tOccasion(o) })}
                onClick={() => bump(o, -1)}
                className="grid size-11 place-items-center rounded-[11px] text-[19px] text-muted-foreground disabled:text-faint"
                disabled={(mix[o] ?? 0) === 0}
              >
                −
              </button>
              <span className="w-[26px] text-center font-serif text-[18px] tabular-nums text-foreground">
                {mix[o] ?? 0}
              </span>
              <button
                type="button"
                aria-label={t("moreDay", { occasion: tOccasion(o) })}
                onClick={() => bump(o, 1)}
                className="grid size-11 place-items-center rounded-[11px] text-[19px] text-muted-foreground disabled:text-faint"
                disabled={assigned >= dayCount}
              >
                +
              </button>
            </div>
          ))}
        </div>

        {/* The labelled meter — uppercase kicker left, PLAIN-LANGUAGE value
            right, five segments filled in rust. Never a bare number: that is a
            named rule, and `REWEAR_LABELS` settles the wears-vs-re-wears
            ambiguity the design comp left open. */}
        <div className="mt-[26px]">
          <div className="mb-[11px] flex items-baseline justify-between">
            <Kicker>{t("rewear")}</Kicker>
            <span className="text-[15px] text-value">{t(`rewearLevels.${REWEAR_LEVELS[level - 1] ?? "3"}.label`)}</span>
          </div>
          <div className="flex gap-[6px]">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={t(`rewearLevels.${REWEAR_LEVELS[n - 1]}.label`)}
                aria-pressed={n <= level}
                onClick={() => setLevel(n)}
                className="flex h-11 flex-1 items-center"
              >
                <span
                  className={`h-2 w-full rounded-full ${n <= level ? "bg-brand" : "bg-[var(--hairline-6)]"}`}
                />
              </button>
            ))}
          </div>
          <p className="mt-[13px] text-sm leading-[1.5] text-muted-foreground text-pretty">
            {t(`rewearLevels.${REWEAR_LEVELS[level - 1] ?? "3"}.hint`)}
          </p>
        </div>

        {error && <p className="mt-4 text-sm text-brand">{error}</p>}

        <LocationSheet
          open={pickerOpen}
          currentLabel={destination.label}
          cities={picker.cities}
          onSearch={picker.search}
          onPick={pickCity}
          onUseMyLocation={picker.geoSupported ? picker.useMyLocation : undefined}
          locating={picker.locating}
          geoError={picker.geoError}
          onClose={() => setPickerOpen(false)}
        />
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <button
          onClick={submit}
          disabled={pending || dayCount === 0}
          className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
        >
          {pending ? t("planning") : t("planAction")}
        </button>
      </div>
    </div>
  );
}

/** Inclusive whole days. Calendar strings, never instants — DST is not a factor. */
export function countDays(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}
