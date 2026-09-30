"use client";

import { useTranslations } from "next-intl";
import { amountLabel, planAmountLabel } from "@/lib/billing/prices";
import { useClientTimeZone } from "@/lib/billing/use-client-time-zone";

/** Currency follows the viewer's time zone exactly as the upgrade sheet does; CHF until hydration. */
export function ProPrice() {
  const t = useTranslations("home.plans");
  const tz = useClientTimeZone();
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <strong className="font-serif text-[34px] font-normal leading-none text-foreground-strong tabular-nums">{planAmountLabel("month", tz)}</strong>
      <span className="text-[14px] text-muted-foreground">{t("perMonth", { yearly: planAmountLabel("year", tz) })}</span>
    </div>
  );
}

export function FreePrice() {
  const t = useTranslations("home.plans");
  const tz = useClientTimeZone();
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <strong className="font-serif text-[34px] font-normal leading-none text-foreground-strong tabular-nums">{amountLabel(0, tz)}</strong>
      <span className="text-[14px] text-muted-foreground">{t("forever")}</span>
    </div>
  );
}
