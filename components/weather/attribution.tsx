"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * `Weather data © OpenWeather` — a SHIPPING REQUIREMENT, not decoration.
 *
 * OpenWeather's self-service tier is ODbL: commercial use is allowed, our code
 * stays closed, and no business licence is needed. The single obligation in
 * return is visible attribution on the screen where the weather appears.
 * ⚠️ Their own explainer marks a help-centre article "too obscure" and a
 * settings sub-page "not visible", so it cannot be filed away somewhere tidy.
 *
 * ⚠️ **PLACEMENT: the credit follows the WEATHER, not the picker.** Three
 * surfaces render a temperature and each carries its own line: the Stylist's
 * `WeatherStrip` (always visible, not only while the city menu is open), the
 * packing day list and the outfit detail (at the foot of the page). The city picker (Stylist menu,
 * Settings, trip setup) shows no weather and carries none (owner, 2026-10-03).
 *
 * ⚠️ **Colour is not a free choice.** `DESIGN.md` sets the readability floor at
 * Warm Gray `#928C7F` (`text-muted-foreground`) and marks Dim/Faint as ornament
 * only. Setting this in Faint to keep it quiet would fail the contrast rule and
 * arguably fail "visible" too. 11px is the documented Label/Kicker step, so the
 * size is on the ramp; the uppercase letterspacing of that step is deliberately
 * NOT used, because a licence credit is not a wayfinding label.
 */
export function WeatherAttribution({ className }: { className?: string }) {
  const t = useTranslations("weather");
  return (
    <p className={cn("text-[11px] leading-[1.4] text-muted-foreground", className)}>
      {t("attribution")}
    </p>
  );
}
