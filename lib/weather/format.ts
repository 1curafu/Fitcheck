import type { Preferences } from "@/lib/profile/preferences";

export type TempUnit = Preferences["tempUnit"];

/** Whole degrees — a weather strip shows no decimals. */
export function toFahrenheit(tempC: number): number {
  return Math.round((tempC * 9) / 5 + 32);
}

/**
 * Render a stored Celsius temperature in the user's chosen unit.
 *
 * Celsius is the storage and reasoning unit everywhere: Open-Meteo is requested
 * in it, `weatherRules` compares against Celsius thresholds, and the re-rank
 * prompt states °C to the model. This function is the ONLY place the user's
 * preference is applied, and it sits at the render boundary — converting any
 * earlier would put Fahrenheit numbers in front of rules that read them as
 * Celsius.
 *
 * The degree sign is bare in both units, as `Fitcheck.dc.html` draws it. The
 * unit is established once on the Settings screen rather than repeated beside
 * every number.
 */
export function formatTemp(tempC: number, unit: TempUnit = "C"): string {
  const value = unit === "F" ? toFahrenheit(tempC) : Math.round(tempC);
  return `${value}°`;
}
