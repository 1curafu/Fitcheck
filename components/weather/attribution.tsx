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
 * ⚠️ **PLACEMENT: the credit follows the WEATHER, not the picker.** A grep
 * settled that — three surfaces render a temperature, and the location picker
 * sits on only one of them while appearing on two screens that show no weather
 * at all. So: the picker carries it for the Stylist (it opens from the weather
 * pill, so it is a child of the weather control rather than the "settings
 * sub-page" the licence rejects), and the two picker-less surfaces — the
 * packing day list and the outfit detail — carry their own.
 *
 * ⚠️ **Colour is not a free choice.** `DESIGN.md` sets the readability floor at
 * Warm Gray `#928C7F` (`text-muted-foreground`) and marks Dim/Faint as ornament
 * only. Setting this in Faint to keep it quiet would fail the contrast rule and
 * arguably fail "visible" too. 11px is the documented Label/Kicker step, so the
 * size is on the ramp; the uppercase letterspacing of that step is deliberately
 * NOT used, because a licence credit is not a wayfinding label.
 */
export function WeatherAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] leading-[1.4] text-muted-foreground", className)}>
      Weather data © OpenWeather
    </p>
  );
}
