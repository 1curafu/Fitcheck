"use client";

import { useState } from "react";
import Link from "next/link";
import { Shirt } from "lucide-react";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "./back-link";
import { WhyQuote } from "@/components/generate/why-quote";
import { PieceSheet, type SheetPiece, type Alternative } from "./piece-sheet";

export type CapsulePiece = { id: string; name: string; imageUrl: string; pinned: boolean; category: string };

/** A stat tile — the item-detail pattern, lifted rather than re-derived. */
function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col rounded-[13px] bg-surface-1 p-[14px] shadow-[inset_0_0_0_1px_var(--hairline-2)]">
      <div className="font-serif text-[15px] leading-none text-foreground">{value}</div>
      <div className="mt-auto pt-[6px] text-[10px] uppercase tracking-[0.1em] text-muted-dim">
        {label}
      </div>
    </div>
  );
}

/**
 * The hero screen. "Take these nine pieces" is the line that sells packing mode.
 *
 * ⚠️ **Every number comes from the solve.** The design comp reads "Nine pieces."
 * — measured against the real 26-item closet it is SEVEN at the default level.
 * Nothing here may hardcode a size.
 */
export function CapsuleView({
  destination,
  dateRange,
  pieces,
  dayCount,
  outfitCount,
  why,
  tripId,
  beyondHorizon,
  alternatives,
}: {
  destination: string;
  dateRange: string;
  pieces: CapsulePiece[];
  dayCount: number;
  outfitCount: number;
  why: string;
  tripId: string;
  beyondHorizon: boolean;
  /** The rest of the closet, so a piece can be swapped for a real alternative. */
  alternatives: Alternative[];
}) {
  // Tapping a piece asks what to do with it. Navigating straight to the item
  // would be the wrong default here: on this screen the question is "does this
  // go in the case", not "tell me about this shirt" — and the sheet offers that
  // as its third option anyway.
  const [selected, setSelected] = useState<SheetPiece | null>(null);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top px-[22px]">
        <div className="mb-[10px] flex items-center gap-3">
          <PackingBack href="/packing" />
        </div>
        <Kicker className="block">{`${destination} · ${dateRange}`}</Kicker>
        <h1 className="mt-[16px] font-serif text-[40px]/[1.05] tracking-[-0.02em] text-foreground-strong">
          {countWord(pieces.length)}
        </h1>

        <div className="mt-4 flex gap-2">
          <Tile value={String(pieces.length)} label="Pieces" />
          <Tile value={String(dayCount)} label="Days" />
          <Tile value={String(outfitCount)} label="Outfits" />
        </div>
      </div>

      {/* The cutouts are the largest thing on screen — the clothes speak, the
          UI whispers. `surface-stage` is the design's radial stage, not a flat fill.
          ⚠️ The wrapper is a flex COLUMN with `min-h-0`: the first version made
          the grid `h-full`, which pushed the name list and the why line clean
          off the screen. And the row count follows the piece count — a fixed
          three rows left a third of the stage empty for a six-piece capsule,
          and the capsule size is measured, never assumed. */}
      <div className="mt-[14px] flex min-h-0 flex-1 flex-col px-[22px]">
        <div
          className="grid min-h-0 flex-1 grid-cols-3 gap-[10px] overflow-hidden rounded-[18px] p-[20px] surface-stage"
          style={{ gridTemplateRows: `repeat(${Math.max(1, Math.ceil(pieces.length / 3))}, minmax(0, 1fr))` }}
        >
          {pieces.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected({ id: p.id, name: p.name, pinned: p.pinned, category: p.category })}
              aria-label={`Change ${p.name}`}
              className="relative grid place-items-center"
            >
              {/* A pinned piece is marked: the user insisted on it, and a
                  re-solve that kept it should look deliberate rather than lucky. */}
              {p.pinned && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 size-[7px] rounded-full bg-brand"
                />
              )}
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-contain"
                />
              )}
            </button>
          ))}
        </div>
        <p className="mt-[11px] shrink-0 text-[10px] uppercase leading-[1.65] tracking-[0.13em] text-muted-foreground">
          {pieces.map((p) => p.name).join(" · ")}
        </p>
        {/* ⚠️ Nothing said the pieces were tappable, so the one thing the user
            most wanted to do — change what is in the case — was invisible. A
            capsule you cannot see how to edit is a capsule you have to accept. */}
        <p className="mt-[6px] shrink-0 text-[12px] text-muted-foreground">
          Tap a piece to swap it or leave it behind.
        </p>
      </div>

      {/* ⚠️ Clears the sticky action bar. Without the padding the why line — the
          product's differentiator, and a named rule says it is never truncated —
          sits UNDER "See the days". The stage above is `flex-1`, so it gives up
          the space rather than the sentence doing so. */}
      <div className="shrink-0 px-[22px] pb-[112px]">
        <WhyQuote name={`${dayCount} days · ${pieces.length} pieces`} why={why} />
        {beyondHorizon && (
          // ⚠️ Said out loud rather than hidden. Part of this trip is past the
          // forecast, so the weather behind it is a stand-in — a capsule built
          // on invented weather is worse than one that admits it.
          <p className="mt-[10px] text-[13px] leading-[1.45] text-muted-foreground">
            Part of this trip is beyond the forecast, so its weather is an estimate.
          </p>
        )}
      </div>

      {/* ⚠️ The canonical bottom action bar — one small secondary, one primary
          pill — and the secondary is the way OUT. These screens carry no bottom
          nav (they have a sticky action, and the two stacked is the bug
          docs/STATE.md records), so without this the only exit was two taps of
          a small back chevron. Three levels deep with no one-tap way home is
          not an acceptable place to leave someone. */}
      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <Link
          href="/closet"
          aria-label="Done — back to the closet"
          className="grid h-[54px] w-14 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-muted-foreground shadow-[inset_0_0_0_1px_var(--hairline-6)]"
        >
          <Shirt size={19} />
        </Link>
        <Link
          href={`/packing/${tripId}/days`}
          className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
        >
          See the days
        </Link>
      </div>

      <PieceSheet
        tripId={tripId}
        piece={selected}
        alternatives={alternatives}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/**
 * The count as a sentence, because the headline is a serif display line and
 * "7 pieces." reads like a label where "Seven pieces." reads like a claim.
 */
const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];
export function countWord(n: number): string {
  const word = WORDS[n] ?? String(n);
  return `${word} piece${n === 1 ? "" : "s"}.`;
}
