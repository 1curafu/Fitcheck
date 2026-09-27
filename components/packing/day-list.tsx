"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "./back-link";
import { WhyQuote } from "@/components/generate/why-quote";
import { formatTemp, type TempUnit } from "@/lib/weather/format";
import { WeatherAttribution } from "@/components/weather/attribution";
import type { UiOccasion } from "@/lib/generator/types";

export type DayCard = {
  /** The stored outfit, so the card can open the look it describes. */
  outfitId: string;
  date: string;
  label: string;
  occasion: string;
  tempC: number;
  rain: boolean;
  name: string;
  why: string;
  pieces: { id: string; name: string; imageUrl: string; wear: number }[];
};

/**
 * A day of the trip.
 *
 * ⚠️ **The wear counts are not decoration.** Without them a user counts four
 * shirts against seven days and stops trusting the capsule. They are the
 * feature's honesty, rendered.
 */
export function DayList({
  destination,
  dateRange,
  days,
  unit,
  backHref,
}: {
  destination: string;
  dateRange: string;
  days: DayCard[];
  unit: TempUnit;
  backHref: string;
}) {
  const t = useTranslations("packing");
  const tOccasion = useTranslations("vocab.occasion");
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top px-[22px]">
        <div className="mb-[10px] flex items-center gap-3">
          <PackingBack href={backHref} />
        </div>
        <Kicker className="block">{`${destination} · ${dateRange}`}</Kicker>
        <h1 className="mt-[14px] font-serif text-3xl/[1.12] tracking-[-0.01em] text-foreground-strong">
          {t("dayTitle", { days: days.length })}
        </h1>
      </div>

      {/* Extra bottom padding: this screen DOES carry the bottom nav — it has
          no sticky action of its own, so there is nothing for the nav to cover.
          That is the rule: a screen may have a sticky primary action or the
          nav, never both. */}
      <div className="mt-4 flex flex-col gap-[10px] px-[22px] pb-[calc(env(safe-area-inset-bottom)+96px)]">
        {/* ⚠️ The whole card opens the look. A day that describes an outfit and
            cannot be opened is a dead end — and `/outfits/[id]` already carries
            the flat-lay, the wear button and the favourite, so this needs no
            new screen. */}
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/outfits/${d.outfitId}`}
            className="block rounded-[16px] bg-surface-1 px-[14px] pb-[13px] pt-3 shadow-[inset_0_0_0_1px_var(--hairline-3)]"
          >
            <header className="flex items-center gap-[10px]">
              <div className="font-serif text-[17px] text-foreground">{d.label}</div>
              <span className="size-[3px] rounded-full bg-muted-dim" aria-hidden="true" />
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-brand-high">
                {(["everyday", "work", "weekend", "evening"] as string[]).includes(d.occasion)
                  ? tOccasion(d.occasion as UiOccasion) : d.occasion}
              </div>
              <div className="flex-1" />
              <div className="text-[13px] tabular-nums text-muted-foreground">
                {formatTemp(d.tempC, unit)}
                {d.rain ? ` · ${t("rain")}` : ""}
              </div>
            </header>

            <div className="mt-3 flex h-[88px] items-center justify-around rounded-[14px] px-[14px] py-2 surface-stage">
              {d.pieces.map((p) =>
                p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.imageUrl}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="size-full max-w-[24%] object-contain"
                  />
                ) : null,
              )}
            </div>

            <p className="mt-[9px] text-[10px] uppercase leading-[1.6] tracking-[0.13em] text-muted-foreground">
              {d.pieces.map((p) => `${p.name} · ${t("wearOrdinal", { n: p.wear })}`).join("  ·  ")}
            </p>

            <WhyQuote name={d.name} why={d.why} />
          </Link>
        ))}
        {/* ⚠️ REQUIRED by ODbL — every card above shows a temperature. ONCE at
            the foot rather than per card: five copies is noise, and the licence
            asks for visible credit on the screen, not on each element. */}
        <WeatherAttribution className="mt-1" />
      </div>
    </div>
  );
}
