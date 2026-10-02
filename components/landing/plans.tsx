import { getTranslations } from "next-intl/server";
import { PRO_BENEFIT_KEYS } from "@/lib/billing/benefits";
import { FREE } from "@/lib/billing/tiers";
import { CtaLink } from "./cta-link";
import { FreePrice, ProPrice } from "./pro-price";
import { Section, SectionHead, Tick } from "./section";

export async function Plans() {
  const t = await getTranslations("home.plans");
  const cta = await getTranslations("home.hero");
  const benefits = await getTranslations("billing.benefits");
  const free = [t("freeDaily"), t("freeRerolls", { count: FREE.regeneratesPerDay ?? 0 }), t("freeCloset", { count: FREE.closetItems ?? 0 }), t("freeDiary"), t("freeSaved", { count: FREE.savedOutfits ?? 0 })];
  const pro = [t("everythingFree"), ...PRO_BENEFIT_KEYS.map((key) => benefits(`${key}.label`))];
  const item = "grid grid-cols-[18px_1fr] gap-2.5 text-[15px] text-value";
  return (
    <Section id="plans-title">
      <SectionHead id="plans-title" kicker={t("kicker")} title={t("title")} body={t("body")} />
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <div className="grid content-start gap-[18px] rounded-[18px] bg-surface-1 px-[22px] py-6 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
          <h3 className="font-serif text-[28px] leading-none text-foreground-strong">{t("free")}</h3>
          <FreePrice />
          <ul className="m-0 grid list-none gap-[11px] p-0">{free.map((line) => <li key={line} className={item}><Tick />{line}</li>)}</ul>
          <CtaLink label={cta("cta")} />
        </div>
        <div className="grid content-start gap-[18px] rounded-[18px] bg-surface-2 px-[22px] py-6 shadow-[inset_0_0_0_1px_rgba(184,106,71,0.35)]">
          <h3 className="font-serif text-[28px] leading-none text-foreground-strong">{t("pro")}</h3>
          <ProPrice />
          <ul className="m-0 grid list-none gap-[11px] p-0">{pro.map((line) => <li key={line} className={item}><Tick rust />{line}</li>)}</ul>
          <p className="text-[12.5px] text-muted-foreground">{t("proNote")}</p>
        </div>
      </div>
    </Section>
  );
}
