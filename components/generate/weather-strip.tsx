"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WeatherPayload } from "@/lib/generator/types";
import type { City } from "@/lib/weather/geocode";
import { formatTemp } from "@/lib/weather/format";
import { LocationPicker } from "@/components/weather/location-picker";

const HAIR = "border-[rgba(237,230,216,0.07)]";
const HAIR2 = "border-[rgba(237,230,216,0.12)]";

export function WeatherStrip({
  weather,
  cities = [],
  onSearch,
  onCityChange,
  onUseMyLocation,
  locating = false,
  geoError = null,
}: {
  weather: WeatherPayload;
  cities?: City[];
  onSearch?: (q: string) => void;
  onCityChange?: (c: City) => void;
  onUseMyLocation?: () => void;
  locating?: boolean;
  geoError?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  // laterSentence === lead + adviceClause; render the clause in rust (README §2).
  const lead = weather.laterSentence.slice(0, weather.laterSentence.length - weather.adviceClause.length);

  return (
    <div className="relative">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-serif text-[21px] text-foreground">{formatTemp(weather.tempC, weather.tempUnit)}</span>
        <span className="max-w-[9rem] truncate text-[12.5px] text-muted-foreground">{weather.condition}</span>
        <span className="text-faint">·</span>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[12.5px] text-foreground"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
          <span>{weather.cityLabel}</span>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[11px] text-muted-dim">feels {formatTemp(weather.feelsLikeC, weather.tempUnit)}</span>
      </div>

      {(locating || geoError) && (
        <p role="status" className="mt-1 text-[11.5px] text-muted-foreground">
          {locating ? "Locating…" : geoError}
        </p>
      )}

      {menuOpen && (
        <LocationPicker
          className="absolute z-20 mt-2 w-full"
          cities={cities}
          currentLabel={weather.cityLabel}
          onSearch={(q) => onSearch?.(q)}
          onPick={(c) => {
            onCityChange?.(c);
            setMenuOpen(false);
          }}
          onUseMyLocation={
            onUseMyLocation
              ? () => {
                  onUseMyLocation();
                  setMenuOpen(false);
                }
              : undefined
          }
        />
      )}

      <button
        type="button"
        data-testid="later-toggle"
        aria-expanded={showHourly}
        onClick={() => setShowHourly((s) => !s)}
        className="mt-[7px] flex w-full items-center gap-2 text-left text-[11.5px] text-muted-foreground"
      >
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-dim">{weather.laterLabel}</span>
        <span className="h-[3px] w-[3px] rounded-full bg-faint" />
        <span>
          {lead}
          <b className="font-semibold text-brand-high">{weather.adviceClause}</b>
        </span>
        <svg
          className={cn("ml-auto h-[11px] w-[11px] shrink-0 text-muted-dim transition-transform", showHourly && "rotate-180")}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showHourly && (
        <div data-testid="hourly" className="mt-[10px] flex gap-[7px]">
          {weather.hourly.map((h, i) => (
            <div
              key={i}
              data-now={h.isNow}
              className={cn(
                "flex-1 rounded-[11px] border p-2 text-center",
                h.isNow ? cn(HAIR2, "bg-foreground/5") : HAIR,
              )}
            >
              <div className={cn("text-[9px]", h.isNow ? "text-brand-high" : "text-muted-dim")}>
                {h.isNow ? "Now" : h.hh}
              </div>
              <div
                data-rain={h.rain}
                className={cn("mx-auto my-1 h-[18px] w-[18px]", h.rain ? "text-brand-high" : "text-muted-foreground")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 18a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.6-.5A4 4 0 0 1 17 18z" />
                </svg>
              </div>
              <div className="text-[11.5px] text-foreground">{formatTemp(h.tempC, weather.tempUnit)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
