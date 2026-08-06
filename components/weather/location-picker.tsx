"use client";

import { cn } from "@/lib/utils";
import type { City } from "@/lib/weather/geocode";

const HAIR2 = "border-[rgba(237,230,216,0.12)]";

/**
 * The city menu, shared by the Stylist's weather pill and the Settings location
 * row. Presentational — all browser-API state lives in `useLocationPicker`.
 *
 * Lifted verbatim from `weather-strip.tsx` so the two screens cannot drift into
 * offering different ways to change the same setting.
 *
 * The `locating` / `geoError` status line is deliberately NOT here: the Stylist
 * shows it even with the menu closed (you tap "use my location", the menu
 * dismisses, and the feedback has to survive that), while Settings shows it
 * beside its row. Placement is a per-screen concern, so each renders its own.
 */
export function LocationPicker({
  cities,
  currentLabel,
  onSearch,
  onPick,
  onUseMyLocation,
  className,
}: {
  cities: City[];
  currentLabel?: string;
  onSearch: (q: string) => void;
  onPick: (c: City) => void;
  /** Omitted when the browser has no geolocation at all — then search is the only path. */
  onUseMyLocation?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <ul
        role="listbox"
        aria-label="Choose a city"
        className={cn("w-full rounded-[12px] border bg-surface-3 p-1.5", HAIR2)}
      >
        {onUseMyLocation && (
          <li>
            <button
              type="button"
              onClick={onUseMyLocation}
              className="flex min-h-11 w-full items-center gap-2 rounded-[8px] px-3 text-left text-[13px] text-foreground hover:bg-foreground/5"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2v3.2M12 18.8V22M22 12h-3.2M5.2 12H2" strokeLinecap="round" />
              </svg>
              Use my location
            </button>
          </li>
        )}
        <li className="p-1">
          <input
            aria-label="Search a city"
            placeholder="Search a city…"
            onChange={(e) => onSearch(e.target.value)}
            className="w-full rounded-[8px] bg-surface-1 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-dim"
          />
        </li>
        {cities.map((c) => (
          <li key={`${c.name}-${c.lat}`}>
            <button
              type="button"
              role="option"
              aria-selected={c.name === currentLabel}
              onClick={() => onPick(c)}
              className="flex min-h-11 w-full items-center justify-between rounded-[8px] px-3 text-left text-[13px] text-foreground hover:bg-foreground/5"
            >
              {c.name}
              <span className="text-[10px] text-muted-dim">{c.country}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
