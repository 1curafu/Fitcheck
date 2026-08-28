"use client";

import { cn } from "@/lib/utils";
import { regionLabel, type City } from "@/lib/weather/geocode";

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
  variant = "overlay",
  className,
}: {
  cities: City[];
  currentLabel?: string;
  onSearch: (q: string) => void;
  onPick: (c: City) => void;
  /** Omitted when the browser has no geolocation at all — then search is the only path. */
  onUseMyLocation?: () => void;
  /**
   * `overlay` floats over the page (the Stylist's weather pill) and carries its
   * own card. `bare` has no surface of its own and uses hairline-divided rows,
   * for when it already sits inside one — nesting the overlay inside another
   * card produced two borders and two backgrounds, which is what made it look
   * wrong in Settings.
   */
  variant?: "overlay" | "bare";
  className?: string;
}) {
  const bare = variant === "bare";
  const row = bare
    ? "flex min-h-11 w-full items-center px-4 py-[13px] text-left text-[14px] text-foreground"
    : "flex min-h-11 w-full items-center rounded-[8px] px-3 text-left text-[13px] text-foreground hover:bg-foreground/5";
  return (
    <div className={className}>
      <ul
        role="listbox"
        aria-label="Choose a city"
        className={cn(
          "w-full",
          bare ? "overflow-hidden" : cn("rounded-[12px] border bg-surface-3 p-1.5", HAIR2),
        )}
      >
        {onUseMyLocation && (
          <li>
            <button
              type="button"
              onClick={onUseMyLocation}
              className={cn(row, "gap-2")}
              style={bare ? { borderBottom: "1px solid var(--hairline-2)" } : undefined}
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
        <li className={bare ? undefined : "p-1"}>
          <input
            aria-label="Search a city"
            placeholder="Search a city…"
            onChange={(e) => onSearch(e.target.value)}
            className={cn(
              "w-full text-foreground outline-none placeholder:text-muted-dim",
              bare
                ? "bg-transparent px-4 py-[13px] text-[14px]"
                : "rounded-[8px] bg-surface-1 px-3 py-2 text-sm",
            )}
            style={bare ? { borderBottom: "1px solid var(--hairline-2)" } : undefined}
          />
        </li>
        {cities.map((c) => (
          <li key={`${c.name}-${c.lat}`}>
            <button
              type="button"
              role="option"
              aria-selected={c.name === currentLabel}
              onClick={() => onPick(c)}
              className={cn(row, "justify-between")}
              style={bare ? { borderTop: "1px solid var(--hairline-2)" } : undefined}
            >
              {c.name}
              {/* ⚠️ Region, not bare country. OpenWeather returns same-name
                  duplicates freely — "Springfield" comes back five times, all
                  US — so `country` alone renders five identical, unpickable
                  rows. `regionLabel` adds the state where there is one. */}
              <span className={bare ? "text-[12.5px] text-muted-dim" : "text-[10px] text-muted-dim"}>
                {regionLabel(c)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
