import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { FlatLay } from "@/components/generate/flat-lay";
import { WhyQuote } from "@/components/generate/why-quote";
import { vocabLabel } from "@/lib/i18n/vocab-server";
import {
  EXAMPLE_CLOSET, EXAMPLE_LOOKS, EXAMPLE_PIECES, EXAMPLE_WEATHER, exampleLookPieces, type ExamplePieceKey,
} from "@/lib/landing/example-looks";
import { cn } from "@/lib/utils";
import { formatTemp } from "@/lib/weather/format";
import { Section, SectionHead } from "./section";

const LOOK = EXAMPLE_LOOKS[0];

export async function ExampleSection() {
  const t = await getTranslations("home");
  const closet = await getTranslations("closet");
  const vocab = await getTranslations("vocab");
  const weather = await getTranslations("weather");
  const locale = await getLocale();
  const temp = (c: number) => formatTemp(c, "C", locale);
  const piece = (key: ExamplePieceKey) => t(`pieces.${key}`);
  const tags = [t("example.subcategory"), vocabLabel(vocab, "color", "navy"), vocabLabel(vocab, "material", "Wool"),
    vocabLabel(vocab, "texture", "Fine knit"), vocabLabel(vocab, "season", "Autumn"), vocabLabel(vocab, "season", "Winter")];

  return (
    <Section id="ex-title">
      <SectionHead id="ex-title" kicker={t("example.kicker")} title={t("example.title")} body={t("example.body")} />
      <div className="grid items-center gap-[26px] lg:grid-cols-[minmax(0,0.9fr)_56px_minmax(0,1.1fr)] lg:gap-5">
        <div className="rounded-[18px] bg-surface-1 p-[18px] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
          <div className="mb-3.5 flex items-baseline justify-between">
            <h3 className="font-serif text-[20px] text-foreground">{closet("title")}</h3>
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-dim">{closet("pieces", { count: EXAMPLE_CLOSET.length })}</span>
          </div>
          <ul aria-label={closet("title")} className="m-0 grid list-none grid-cols-3 gap-2 p-0">
            {EXAMPLE_CLOSET.map((key) => {
              const inLook = LOOK.pieces.includes(key);
              return (
                <li key={key} className={cn("relative aspect-square rounded-[12px] bg-surface-2 p-2.5",
                  inLook ? "shadow-[inset_0_0_0_1px_rgba(184,106,71,0.55)]" : "shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={EXAMPLE_PIECES[key].src} alt={inLook ? t("pieces.inLook", { piece: piece(key) }) : piece(key)}
                    loading="lazy" decoding="async" width={200} height={200} className="size-full object-contain" />
                  {inLook && <span aria-hidden className="absolute right-[7px] top-[7px] size-[7px] rounded-full bg-brand" />}
                </li>
              );
            })}
          </ul>
          <ul aria-label={t("example.tagsLabel", { piece: piece("navySweater") })} className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
            <li aria-hidden className="self-center text-[10px] uppercase tracking-[0.18em] text-muted-dim">{t("example.tags")}</li>
            {tags.map((tag) => (
              <li key={tag} className="rounded-full px-2.5 py-[5px] text-[11.5px] text-value shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)] first-letter:uppercase">{tag}</li>
            ))}
          </ul>
        </div>
        <ArrowRight aria-hidden size={28} strokeWidth={1.3} className="justify-self-center rotate-90 text-muted-dim lg:rotate-0" />
        <div className="grid gap-1">
          <p className="mb-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-muted-foreground">
            <span className="font-medium text-foreground">{vocabLabel(vocab, "occasion", "everyday")}</span>
            <span>{temp(EXAMPLE_WEATHER.tempC)} {weather("conditions.partlyCloudy")}, {t("example.upTo", { temperature: temp(EXAMPLE_WEATHER.highC) })}</span>
            <span>{t("preview.city")}</span>
          </p>
          <div className="flex aspect-[385/250] w-full">
            <FlatLay look={{ pieces: exampleLookPieces(LOOK.pieces, piece) }} />
          </div>
          <div className="[&_p:first-child]:text-[clamp(19px,2.4vw,23px)]">
            <WhyQuote name={t(`looks.${LOOK.key}.name`)} why={t(`looks.${LOOK.key}.why`)} />
          </div>
          <p className="mt-3.5 max-w-[60ch] text-[12.5px] text-muted-foreground">{t("example.caption")}</p>
        </div>
      </div>
    </Section>
  );
}
