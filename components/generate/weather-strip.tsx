"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WeatherPayload } from "@/lib/generator/types";
import type { City } from "@/lib/weather/geocode";

const HAIR = "border-[rgba(237,230,216,0.07)]";
const HAIR2 = "border-[rgba(237,230,216,0.12)]";

export function WeatherStrip({
  weather,
  cities = [],
  onSearch,
  onCityChange,
}: {
  weather: WeatherPayload;
  cities?: City[];
  onSearch?: (q: string) => void;
  onCityChange?: (c: City) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  // laterSentence === lead + adviceClause; render the clause in rust (README §2).
  const lead = weather.laterSentence.slice(0, weather.laterSentence.length - weather.adviceClause.length);

  return (
    <div className="relative">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-serif text-[21px] text-foreground">{weather.tempC}°</span>
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
        <span className="text-[11px] text-muted-dim">feels {weather.feelsLikeC}°</span>
      </div>

      {menuOpen && (
        <ul role="listbox" aria-label="Choose a city" className={cn("absolute z-20 mt-2 w-full rounded-[12px] border bg-surface-3 p-1.5", HAIR2)}>
          <li className="p-1">
            <input
              aria-label="Search a city"
              placeholder="Search a city…"
              onChange={(e) => onSearch?.(e.target.value)}
              className="w-full rounded-[8px] bg-surface-1 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-dim"
            />
          </li>
          {cities.map((c) => (
            <li key={`${c.name}-${c.lat}`}>
              <button
                type="button"
                role="option"
                aria-selected={c.name === weather.cityLabel}
                onClick={() => {
                  onCityChange?.(c);
                  setMenuOpen(false);
                }}
                className="flex min-h-11 w-full items-center justify-between rounded-[8px] px-3 text-left text-[13px] text-foreground hover:bg-foreground/5"
              >
                {c.name}
                <span className="text-[10px] text-muted-dim">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
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
              <div className="text-[11.5px] text-foreground">{h.tempC}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
