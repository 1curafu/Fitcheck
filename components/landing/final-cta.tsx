import { getTranslations } from "next-intl/server";
import { CtaLink } from "./cta-link";

export async function FinalCta() {
  const t = await getTranslations("home");
  return (
    <section aria-labelledby="final-title" className="grid gap-[22px] pb-[72px] pt-24">
      <p className="text-[12px] uppercase tracking-[0.3em] text-brand">{t("final.kicker")}</p>
      <h2 id="final-title" className="max-w-[14ch] font-serif text-[clamp(38px,9vw,72px)] leading-none tracking-[-0.02em] text-foreground-strong text-balance">{t("final.title")}</h2>
      <p className="max-w-[40ch] font-serif text-[19px] italic leading-[1.4] text-muted-foreground">
        <span aria-hidden className="mr-2 inline-flex size-5 -translate-y-px items-center justify-center rounded-full bg-brand align-middle font-serif text-[12px] not-italic text-canvas">f</span>
        {t("final.line")}
      </p>
      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5">
        <CtaLink id="final-cta" label={t("hero.cta")} />
        <span className="text-[12.5px] text-muted-foreground">{t("final.note")}</span>
      </div>
    </section>
  );
}
