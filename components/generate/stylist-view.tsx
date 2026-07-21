"use client";

import { WeatherStrip } from "./weather-strip";
import { OccasionRow } from "./occasion-row";
import { RefineSheet } from "./refine-sheet";
import { IndexTabs } from "./index-tabs";
import { FlatLay } from "./flat-lay";
import { WhyQuote } from "./why-quote";
import { Credits } from "./credits";
import type { Look, UiOccasion, WeatherPayload } from "@/lib/generator/types";
import type { City } from "@/lib/weather/geocode";

export type StylistStatus = "loading" | "ok" | "empty" | "error";

/**
 * An empty result is almost never "add more pieces" — it's one specific gap for
 * one specific occasion (e.g. no shoes formal enough for Evening). Naming the gap
 * turns a dead end into a next step.
 */
function emptyCopy(missing: string | null | undefined, occasionLabel: string): string {
  switch (missing) {
    case "Shoes":
      return `No shoes formal enough for ${occasionLabel} — add dressier footwear, or try another occasion.`;
    case "Tops":
      return `No tops that suit ${occasionLabel} — add one, or try another occasion.`;
    case "Bottoms":
      return `No bottoms that suit ${occasionLabel} — add a pair, or try another occasion.`;
    default:
      return "Add a few more pieces to unlock outfits";
  }
}

export function StylistView(props: {
  status: StylistStatus;
  weather: WeatherPayload | null;
  looks: Look[];
  selectedLook: number;
  occasion: UiOccasion;
  cities: City[];
  refineOpen: boolean;
  /** Required slot that blocked every combo, when status === "empty". */
  missing?: string | null;
  onOccasion: (o: UiOccasion) => void;
  onOpenRefine: () => void;
  onCloseRefine: () => void;
  onRefineApply: (r: { formality: number; mustColors: string[] }) => void;
  onCityChange: (c: City) => void;
  onCitySearch: (q: string) => void;
  onUseMyLocation?: () => void; // absent when the browser has no geolocation API
  locating: boolean;
  geoError: string | null;
  onSelectLook: (i: number) => void;
  onRetry: () => void;
  onOpenItem: (itemId: string) => void;
}) {
  const { status, weather, looks, selectedLook, occasion } = props;
  const look = looks[selectedLook];
  const occLabel = occasion.charAt(0).toUpperCase() + occasion.slice(1);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-[22px] pt-[46px]">
      <h1 className="mb-[10px] font-serif text-[24px] text-foreground">Today&apos;s Looks</h1>

      {weather ? (
        <WeatherStrip
          weather={weather}
          cities={props.cities}
          onSearch={props.onCitySearch}
          onCityChange={props.onCityChange}
          onUseMyLocation={props.onUseMyLocation}
          locating={props.locating}
          geoError={props.geoError}
        />
      ) : (
        <div className="h-10 animate-pulse rounded bg-surface-1" />
      )}

      <div className="mt-[11px]">
        <OccasionRow occasion={occasion} onOccasion={props.onOccasion} onRefine={props.onOpenRefine} />
      </div>

      {looks.length > 0 && (
        <div className="mt-[15px]">
          <IndexTabs names={looks.map((l) => l.name)} selected={selectedLook} onSelect={props.onSelectLook} />
        </div>
      )}

      <div className="mt-[16px] flex flex-1 flex-col">
        {status === "loading" && (
          <div data-testid="stylist-skeleton" className="flex flex-1 flex-col gap-4">
            <div className="flex-1 animate-pulse rounded-[16px] bg-surface-1" style={{ minHeight: 200 }} />
            <div className="h-5 w-3/4 animate-pulse rounded bg-surface-1" />
          </div>
        )}

        {status === "empty" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="font-serif text-[20px] text-foreground">Nothing to style yet</p>
            <p data-testid="empty-copy" className="max-w-[30ch] text-sm text-muted-foreground">
              {emptyCopy(props.missing, occLabel)}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t reach the stylist.</p>
            <button
              type="button"
              onClick={props.onRetry}
              className="rounded-[12px] bg-foreground px-5 py-2.5 text-sm font-semibold text-canvas"
            >
              Try again
            </button>
          </div>
        )}

        {status === "ok" && look && (
          <>
            <FlatLay look={look} />
            <WhyQuote name={look.name} why={look.why} />
            <Credits pieces={look.pieces} onOpenItem={props.onOpenItem} />
          </>
        )}
      </div>

      <RefineSheet
        open={props.refineOpen}
        occasionLabel={occLabel}
        onApply={props.onRefineApply}
        onClose={props.onCloseRefine}
      />
    </main>
  );
}
