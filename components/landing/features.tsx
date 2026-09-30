import { getTranslations } from "next-intl/server";
import { PRO_BENEFIT_KEYS } from "@/lib/billing/benefits";
import { Section, SectionHead, TierBadge } from "./section";

const LEAD = ["daily", "weather", "occasion", "wardrobe"] as const;
const CARD = "grid content-start gap-1.5 rounded-[14px] bg-surface-1 p-[18px] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]";

export async function Features() {
  const t = await getTranslations("home.features");
  const benefits = await getTranslations("billing.benefits");
  return (
    <Section id="feat-title">
      <SectionHead id="feat-title" kicker={t("kicker")} title={t("title")} />
      <div className="grid md:grid-cols-2 md:gap-x-10">
        {LEAD.map((key) => (
          <article key={key} className="grid gap-2 border-t border-[rgba(237,230,216,0.07)] py-6">
            <h3 className="font-serif text-[24px] leading-[1.2] text-foreground">{t(`${key}.title`)}</h3>
            <p className="max-w-[44ch] text-muted-foreground">{t(`${key}.body`)}</p>
          </article>
        ))}
      </div>
      <div className="mt-14">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-dim">{t("proKicker")}</p>
        <ul className="m-0 grid list-none gap-2.5 p-0 md:grid-cols-2 lg:grid-cols-4">
          {PRO_BENEFIT_KEYS.map((key) => (
            <li key={key} className={CARD}>
              <div className="flex items-center justify-between gap-2.5">
                <h3 className="font-serif text-[18px] leading-[1.25] text-foreground">{benefits(`${key}.label`)}</h3>
                <TierBadge tier="pro" label={t("pro")} />
              </div>
              <p className="text-[14.5px] text-muted-foreground">{benefits(`${key}.description`)}</p>
            </li>
          ))}
          <li className={CARD}>
            <div className="flex items-center justify-between gap-2.5">
              <h3 className="font-serif text-[18px] leading-[1.25] text-foreground">{t("share.title")}</h3>
              <TierBadge tier="free" label={t("free")} />
            </div>
            <p className="text-[14.5px] text-muted-foreground">{t("share.body")}</p>
          </li>
        </ul>
      </div>
    </Section>
  );
}
