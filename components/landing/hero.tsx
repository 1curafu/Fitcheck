import { getTranslations } from "next-intl/server";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { STARTER_PIECES } from "@/lib/landing/example-looks";
import { CtaLink } from "./cta-link";
import { StylistPreview } from "./stylist-preview";

export async function Hero() {
  const t = await getTranslations("home.hero");
  const proof = [t("proofBrowser"), t("proofStart", { count: STARTER_PIECES }), t("proofLanguages", { count: SHIPPED_LOCALES.length })];
  return (
    <section aria-labelledby="hero-title" className="grid gap-[34px] pb-[72px] pt-[18px] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-14 lg:pb-[104px] lg:pt-10">
      <div className="grid content-start gap-[22px] lg:gap-[26px]">
        <p className="text-[12px] uppercase tracking-[0.3em] text-brand">{t("kicker")}</p>
        <h1 id="hero-title" className="font-serif text-[clamp(38px,10.6vw,76px)] leading-[0.98] tracking-[-0.025em] text-foreground-strong text-balance">
          {t("titleLead")} <em className="italic text-foreground">{t("titleEmphasis")}</em>
        </h1>
        <p className="max-w-[34ch] text-[17px]/[1.5] text-value md:text-[18px]">{t("lede")}</p>
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5">
          <CtaLink id="hero-cta" label={t("cta")} />
          <span className="text-[12.5px] text-muted-foreground">{t("noCard")}</span>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-x-[18px] gap-y-2 p-0 text-[12.5px] text-muted-foreground">
          {proof.map((line) => (
            <li key={line} className="inline-flex items-center gap-[7px]"><span aria-hidden className="size-1 rounded-full bg-muted-dim" />{line}</li>
          ))}
        </ul>
      </div>
      <StylistPreview />
    </section>
  );
}
