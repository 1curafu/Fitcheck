"use client";

import { Kicker } from "@/components/ui-fitcheck/kicker";
import { LocationPicker } from "./location-picker";
import type { City } from "@/lib/weather/geocode";

/**
 * Changing your location from Settings.
 *
 * A sheet, not an inline expansion. The first attempt expanded the picker
 * inside the Location row and it read as a card inside a card — two borders,
 * two backgrounds, an inner box floating in its own margin. That presentation
 * was drawn for the Stylist, where it FLOATS OVER the page rather than nesting
 * inside another surface.
 *
 * A sheet is also the better fit for what this is: a searchable list of unknown
 * length. Inline, the row grows as results arrive and reflows the page under
 * the user's thumb, and the search field can end up beneath the keyboard. The
 * project already reaches for a sheet in exactly this situation (`RefineSheet`,
 * `UpgradeSheet`).
 *
 * ⚠️ `fixed` and `z-[70]`, never `absolute`. `MobileNav` is `z-50` and renders
 * after the page content, so at equal z-index it paints straight over a sheet.
 * `RefineSheet` shipped with this bug AND was an `absolute` child of a
 * `overflow-hidden` `<main>`, which clipped it outright.
 */
export function LocationSheet({
  open,
  currentLabel,
  cities,
  onSearch,
  onPick,
  onUseMyLocation,
  locating = false,
  geoError = null,
  onClose,
}: {
  open: boolean;
  currentLabel?: string;
  cities: City[];
  onSearch: (q: string) => void;
  onPick: (c: City) => void;
  onUseMyLocation?: () => void;
  locating?: boolean;
  geoError?: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-[rgba(6,6,8,0.5)] backdrop-blur-[1.5px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Location"
        // maxWidth inline: the shell caps at 440, and a sheet wider than it
        // would hang off the app on a desktop viewport.
        style={{ maxWidth: 440 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto rounded-t-[22px] border-t border-[rgba(237,230,216,0.12)] bg-surface-2 px-[22px] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3.5"
      >
        <div className="mx-auto mb-4 h-1 w-[34px] rounded-full bg-faint" />

        <Kicker className="block">Location</Kicker>
        <h2 className="mt-2 font-serif text-[24px]/[1.15] text-foreground">
          Where are you dressing for?
        </h2>
        <p className="mt-2 text-sm/[1.5] text-muted-foreground text-pretty">
          Your looks are built around this forecast.
        </p>

        {(locating || geoError) && (
          <p role="status" className="mt-3 text-[12.5px] text-brand-high">
            {locating ? "Locating…" : geoError}
          </p>
        )}

        {/* The list gets its own height and scrolls, rather than growing the
            surface it sits in. `bare` because this card is the surface. */}
        <div
          data-testid="location-results"
          className="mt-4 max-h-[46vh] overflow-y-auto rounded-[14px] bg-surface-1 shadow-[inset_0_0_0_1px_var(--hairline-2)]"
        >
          <LocationPicker
            variant="bare"
            cities={cities}
            currentLabel={currentLabel}
            onSearch={onSearch}
            onPick={onPick}
            onUseMyLocation={onUseMyLocation}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 min-h-[44px] w-full text-[14px] text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
