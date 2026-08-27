"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { REWEAR_LABELS, REWEAR_HINTS } from "@/lib/packing/rewear";
import { planTrip } from "@/app/packing/actions";
import { PackingLockedError } from "@/lib/packing/errors";

/** The product's four occasions. A fifth is never invented here. */
const OCCASIONS = ["work", "everyday", "evening", "weekend"] as const;

export type TripSetupProps = {
  destinationLabel: string;
  lat: number;
  lon: number;
  timezone: string;
  onLocate: React.ReactNode;
};

export function TripSetup({ destinationLabel, lat, lon, timezone, onLocate }: TripSetupProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [mix, setMix] = useState<Record<string, number>>({ work: 0, everyday: 0, evening: 0, weekend: 0 });
  const [level, setLevel] = useState(3);

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
          destinationLabel,
          lat,
          lon,
          timezone,
          startDate,
          endDate,
          occasionMix: mix,
          rewearLevel: level,
        });
        router.push(`/packing/${tripId}`);
      } catch (e) {
        setError(
          e instanceof PackingLockedError || (e as Error)?.message?.includes("Pro feature")
            ? "Packing mode is part of Pro."
            : (e as Error)?.message ?? "Could not plan that trip",
        );
      }
    });
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top flex-1 px-[22px]">
        <Kicker className="block">Packing mode</Kicker>
        <h1 className="mt-[13px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong">
          Where are you going?
        </h1>

        {/* The location picker is SHARED with Settings and the Stylist's weather
            pill — one component, so the three screens cannot drift into offering
            different ways to change the same setting. */}
        <div className="mt-[22px] overflow-hidden rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-3)]">
          <div className="flex min-h-[56px] items-center gap-[13px] border-b border-[var(--hairline-3)] p-4">
            <div className="flex-1 text-sm text-muted-foreground">Destination</div>
            <div className="text-base text-value">{onLocate}</div>
          </div>
          <label className="flex min-h-[56px] items-center gap-[13px] p-4">
            <span className="flex-1 text-sm text-muted-foreground">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-base text-value outline-none"
            />
          </label>
          <label className="flex min-h-[56px] items-center gap-[13px] border-t border-[var(--hairline-3)] p-4">
            <span className="flex-1 text-sm text-muted-foreground">To</span>
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
          <Kicker>Occasion mix</Kicker>
          <span className={`text-[13px] ${assigned === dayCount ? "text-brand-high" : "text-muted-foreground"}`}>
            {assigned} of {dayCount} day{dayCount === 1 ? "" : "s"}
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
              <div className="flex-1 text-base capitalize text-foreground">{o}</div>
              <button
                type="button"
                aria-label={`One fewer ${o} day`}
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
                aria-label={`One more ${o} day`}
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
            <Kicker>Re-wear</Kicker>
            <span className="text-[15px] text-value">{REWEAR_LABELS[level - 1]}</span>
          </div>
          <div className="flex gap-[6px]">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={REWEAR_LABELS[n - 1]}
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
            {REWEAR_HINTS[level - 1]}
          </p>
        </div>

        {error && <p className="mt-4 text-sm text-brand">{error}</p>}
      </div>

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <button
          onClick={submit}
          disabled={pending || dayCount === 0}
          className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas disabled:opacity-60"
        >
          {pending ? "Planning…" : "Plan the trip"}
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
