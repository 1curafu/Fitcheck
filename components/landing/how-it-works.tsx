import { getTranslations } from "next-intl/server";
import { STARTER_PIECES } from "@/lib/landing/example-looks";
import { cn } from "@/lib/utils";
import { Section, SectionHead } from "./section";

const STEPS = ["add", "looks", "wear"] as const;

export async function HowItWorks() {
  const t = await getTranslations("home.how");
  return (
    <Section id="how-title">
      <SectionHead id="how-title" kicker={t("kicker")} title={t("title")} />
      <ol className="m-0 grid list-none p-0 md:grid-cols-3 md:gap-x-7">
        {STEPS.map((step, i) => (
          <li key={step} className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 border-t border-[rgba(237,230,216,0.07)] py-[26px] last:border-b md:grid-cols-1 md:last:border-b-0">
            <span aria-hidden className="row-span-2 font-serif text-[30px] leading-none text-faint tabular-nums md:row-span-1 md:mb-2.5">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-serif text-[23px] leading-[1.2] text-foreground">{t(`steps.${step}.title`)}</h3>
            <p className="max-w-[46ch] text-muted-foreground">{t(`steps.${step}.body`)}</p>
          </li>
        ))}
      </ol>
      <div className="mt-[26px] flex max-w-[640px] items-start gap-3.5 rounded-[14px] bg-surface-1 px-5 py-[18px] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]">
        <span aria-hidden className="flex flex-none gap-[5px] pt-[3px]">
          {Array.from({ length: STARTER_PIECES }, (_, i) => (
            <i key={i} className={cn("h-5 w-4 rounded-[4px]", i < 3
              ? "bg-[rgba(184,106,71,0.35)] shadow-[inset_0_0_0_1px_rgba(184,106,71,0.6)]"
              : "bg-surface-3 shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)]")} />
          ))}
        </span>
        <p className="text-[15px] text-value">
          <strong className="font-semibold text-foreground">{t("effortLead")}</strong> {t("effortBody", { count: STARTER_PIECES })}
        </p>
      </div>
    </Section>
  );
}
