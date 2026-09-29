"use client";

import { CalendarDays, CircleUser, Shirt, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FlatLay } from "@/components/generate/flat-lay";
import { IndexTabs } from "@/components/generate/index-tabs";
import { WhyQuote } from "@/components/generate/why-quote";
import { EXAMPLE_LOOKS, EXAMPLE_WEATHER, exampleLookPieces } from "@/lib/landing/example-looks";
import { cn } from "@/lib/utils";
import { formatTemp } from "@/lib/weather/format";

const HAIR = "shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)]";
const OCCASIONS = ["work", "everyday", "weekend", "evening"] as const;

/**
 * The real stylist screen, fed a fixed example set. Only the tabs are interactive; the weather line,
 * occasions, button and tab bar are decoration (aria-hidden). On a phone the device frame and the
 * secondary rows are dropped — the visitor is already holding a phone.
 */
export function StylistPreview() {
  const t = useTranslations("home");
  const tg = useTranslations("generate");
  const tw = useTranslations("weather");
  const occasion = useTranslations("vocab.occasion");
  const nav = useTranslations("shell.nav");
  const locale = useLocale();
  const [selected, setSelected] = useState(0);
  const temp = (c: number) => formatTemp(c, "C", locale);

  const looks = EXAMPLE_LOOKS.map((look) => ({
    name: t(`looks.${look.key}.name`),
    why: t(`looks.${look.key}.why`),
    pieces: exampleLookPieces(look.pieces, (key) => t(`pieces.${key}`)),
  }));
  const current = looks[selected];

  return (
    <figure aria-label={t("preview.label")}
      className="m-0 w-full md:w-[372px] md:justify-self-center md:rounded-[38px] md:bg-surface-1 md:p-2.5 md:shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)] lg:justify-self-end">
      <div className="flex flex-col border-t border-[rgba(237,230,216,0.07)] pt-[18px] md:min-h-[640px] md:overflow-hidden md:rounded-[29px] md:border-t-0 md:bg-canvas md:px-[18px] md:pt-10">
        <div aria-hidden className="hidden md:block">
          <p className="mb-[3px] text-[10.5px] uppercase tracking-[0.22em] text-muted-dim">{tg("reason.everyday")}</p>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-serif text-[23px] text-foreground">{tg("title")}</p>
            <span className={cn("rounded-full bg-surface-1 px-[11px] py-[7px] text-[11px] text-muted-foreground", HAIR)}>{tg("refine.button")}</span>
          </div>
        </div>
        <div aria-hidden className="flex flex-wrap items-baseline gap-[7px] text-[12px]">
          <span className="font-serif text-[20px] text-foreground">{temp(EXAMPLE_WEATHER.tempC)}</span>
          <span className="text-muted-foreground">{tw("conditions.partlyCloudy")}</span>
          <span className="text-faint">·</span>
          <span className="text-foreground">{t("preview.city")}</span>
          <span className="text-[10.5px] text-muted-dim">{tw("feels", { temperature: temp(EXAMPLE_WEATHER.feelsC) })}</span>
        </div>
        <p aria-hidden className="mt-[5px] hidden text-[11.5px] text-muted-foreground md:block">
          {t("preview.later", { temperature: temp(EXAMPLE_WEATHER.highC) })} <span className="text-brand-high">{t("preview.advice")}</span>
        </p>
        <div aria-hidden className="mt-3 hidden gap-1.5 md:flex">
          {OCCASIONS.map((o) => (
            <span key={o} className={cn("flex-auto rounded-full px-1.5 py-2 text-center text-[12px]",
              o === "everyday"
                ? "bg-[rgba(184,106,71,0.15)] text-brand-high shadow-[inset_0_0_0_1px_rgba(184,106,71,0.5)]"
                : cn("bg-surface-1 text-muted-foreground", HAIR))}>
              {occasion(o)}
            </span>
          ))}
        </div>
        <div className="mt-3.5">
          <IndexTabs names={looks.map((l) => l.name)} selected={selected} onSelect={setSelected} />
        </div>
        <div className="relative mt-3.5 flex aspect-[385/250] w-full">
          {/* key → remount, so the app's anchor-first stagger replays on every switch */}
          <FlatLay key={selected} look={current} />
          <span className={cn("absolute bottom-2.5 right-2.5 z-10 rounded-full bg-[rgba(20,19,22,0.8)] px-2 py-[5px] text-[9.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground", HAIR)}>
            {t("preview.example")}
          </span>
        </div>
        <WhyQuote name={current.name} why={current.why} />
        <span aria-hidden className="mt-4 hidden rounded-[13px] bg-foreground p-3.5 text-center text-[14.5px] font-semibold text-canvas md:block">
          {tg("seeFullLook")}
        </span>
        <div aria-hidden className="-mx-[18px] mt-auto hidden grid-cols-4 border-t border-[rgba(237,230,216,0.07)] pb-5 pt-2.5 md:grid">
          {([["closet", Shirt], ["stylist", Sparkles], ["diary", CalendarDays], ["profile", CircleUser]] as const).map(([key, Icon]) => (
            <span key={key} className={cn("grid justify-items-center gap-1 text-[10px]", key === "stylist" ? "text-brand" : "text-muted-foreground")}>
              <Icon size={19} strokeWidth={1.5} />{nav(key)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
