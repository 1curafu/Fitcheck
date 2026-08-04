"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { WeatherStrip } from "./weather-strip";
import { OccasionRow, RefineButton } from "./occasion-row";
import { RefineSheet } from "./refine-sheet";
import { UpgradeSheet } from "@/components/billing/upgrade-sheet";
import { IndexTabs } from "./index-tabs";
import { FlatLay } from "./flat-lay";
import { WhyQuote } from "./why-quote";
import type { Look, UiOccasion, WeatherPayload } from "@/lib/generator/types";
import type { City } from "@/lib/weather/geocode";

export type StylistStatus = "loading" | "ok" | "empty" | "error" | "limited";

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
  /**
   * The reason the meter gave, when status === "limited". Rendered verbatim:
   * the seam knows WHICH allowance ran out (a regenerate, a styled look), and
   * a message hard-coded here would be wrong for the others.
   */
  limitMessage?: string;
  onOccasion: (o: UiOccasion) => void;
  onOpenRefine: () => void;
  onCloseRefine: () => void;
  onRefineApply: (r: { formality: number; lean: string[] }) => void;
  onCityChange: (c: City) => void;
  onCitySearch: (q: string) => void;
  onUseMyLocation?: () => void; // absent when the browser has no geolocation API
  locating: boolean;
  geoError: string | null;
  onSelectLook: (i: number) => void;
  onRetry: () => void;
  /** Decision 5: the ONLY way to spend an AI call on a day already answered. */
  onRegenerate: () => void;
  /** Opens the Pro sheet when the regenerate allowance is spent. */
  onShowUpgrade?: () => void;
  upgradeOpen?: boolean;
  onCloseUpgrade?: () => void;
  /** The legible "why" for the predicted default occasion (empty until seeded). */
  reason?: string;
}) {
  const { status, weather, looks, selectedLook, occasion } = props;
  const look = looks[selectedLook];
  const occLabel = occasion.charAt(0).toUpperCase() + occasion.slice(1);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden screen-top px-[22px]">
      {/* The legible "why" — a quiet kicker above the title that makes the smart
          default read as intentional. Uses the documented label step. */}
      {props.reason && (
        <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-muted-dim">{props.reason}</p>
      )}
      <div className="mb-[10px] flex items-center justify-between gap-3">
        <h1 className="font-serif text-[24px] text-foreground">Today&apos;s Looks</h1>
        <RefineButton onRefine={props.onOpenRefine} />
      </div>

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
        <OccasionRow occasion={occasion} onOccasion={props.onOccasion} />
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

        {/* Only when there is genuinely nothing to show — a limit hit before any
            look exists for this occasion. If the user HAS looks, they keep them
            and the message replaces the Regenerate control instead (below):
            being told you cannot have more must never cost you what you already
            had, which is exactly what pressing Regenerate would then have done.

            The shape is the empty state's, not the error's — "Try again" would
            be a lie, and the app is working correctly. */}
        {status === "limited" && !look && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="font-serif text-[20px] text-foreground">That&apos;s today&apos;s looks</p>
            <p data-testid="limit-copy" className="max-w-[32ch] text-sm text-muted-foreground">
              {props.limitMessage}
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

        {(status === "ok" || status === "limited") && look && (
          <>
            <div className="relative flex flex-1 flex-col">
              <FlatLay look={look} />
              {/* A worn look is pinned into the day's set rather than removed,
                  so it has to be legible as already-worn. Quiet by design: the
                  screen's one rust accent belongs to the why. */}
              {look.worn && (
                <span className="absolute right-3 top-3 rounded-full bg-[rgba(20,19,22,0.78)] px-[10px] py-[5px] shadow-[inset_0_0_0_1px_var(--hairline-5)] backdrop-blur-[10px]">
                  <Kicker className="text-value">Worn today</Kicker>
                </span>
              )}
            </div>
            <WhyQuote name={look.name} why={look.why} />

            {/* The magazine credit line used to sit here (brand · garment, each
                opening its item). Removed 2026-07-30: the detail screen now
                lists every piece with its brand, image and category, and each
                row opens the same garment page — so the line was a second copy
                of that list costing ~200px of the fold on a 390px phone. */}
            {/* :312 — an explicit, named way into the look. Making the flat-lay
                itself the target was tried and rejected: a whole-image link with
                no visible affordance is not discoverable, and the flat-lay
                already reads as a picture rather than a control. */}
            <Link
              href={`/outfits/${look.id}`}
              className="mt-[18px] block rounded-[13px] bg-foreground p-4 text-center text-base font-semibold text-canvas"
            >
              See the full look
            </Link>

            {/* Regenerate keeps its WORDS. It was a bare uppercase line, which
                read as a caption rather than a control; an icon-only button
                beside the primary was tried next and rejected — nothing tells
                you a ⟳ means "spend an AI call and replace today's looks".
                So: a real button shell, but secondary — bounded, tonal, and
                below the primary, because this is the one control on the screen
                that costs money to press. */}
            {/* The control stays LIVE when the allowance is gone, and tapping
                it opens the same upgrade sheet the styled-look gate uses.
                Replacing it with a caption was tried first and read as a
                validation error rather than a feature you have not bought —
                and it left nothing to press, so nothing explained itself. */}
            <button
              type="button"
              onClick={status === "limited" ? props.onShowUpgrade : props.onRegenerate}
              className="mt-[10px] flex w-full items-center justify-center gap-2 rounded-[13px] bg-surface-1 p-4 text-sm text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-7)]"
            >
              <RotateCcw size={15} />
              Regenerate today&apos;s looks
            </button>
          </>
        )}
      </div>

      <RefineSheet
        open={props.refineOpen}
        occasionLabel={occLabel}
        onApply={props.onRefineApply}
        onClose={props.onCloseRefine}
      />

      <UpgradeSheet
        open={Boolean(props.upgradeOpen)}
        title="Regenerate as often as you like"
        body={props.limitMessage ?? ""}
        onClose={props.onCloseUpgrade ?? (() => {})}
      />
    </main>
  );
}
