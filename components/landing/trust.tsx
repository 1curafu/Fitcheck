import { AlignLeft, Lock, Smartphone, Trash2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { Section, SectionHead } from "./section";

const FACTS = [["device", Smartphone], ["storage", Lock], ["ai", AlignLeft], ["cookies", Trash2]] as const;

export async function Trust() {
  const t = await getTranslations("home.trust");
  const legal = await getTranslations("legal");
  return (
    <Section id="trust-title">
      <div className="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <SectionHead id="trust-title" kicker={t("kicker")} title={t("title")} body={t("body")} />
          <p className="-mt-6 mb-10 flex gap-[18px] text-[14px] lg:mb-0">
            <Link href="/privacy" className="text-brand-high underline underline-offset-[3px]">{legal("privacy.title")}</Link>
            <Link href="/terms" className="text-brand-high underline underline-offset-[3px]">{legal("terms.title")}</Link>
          </p>
        </div>
        <div className="grid md:grid-cols-2 md:gap-x-10">
          {FACTS.map(([key, Icon]) => (
            <div key={key} className="grid grid-cols-[28px_1fr] gap-3 border-t border-[rgba(237,230,216,0.07)] py-[18px]">
              <Icon aria-hidden size={18} strokeWidth={1.6} className="mt-[3px] text-muted-foreground" />
              <div>
                <h3 className="text-[15.5px] font-semibold leading-[1.35] text-foreground">{t(`${key}.title`)}</h3>
                <p className="mt-0.5 max-w-[52ch] text-[14.5px] text-muted-foreground">{t(`${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
