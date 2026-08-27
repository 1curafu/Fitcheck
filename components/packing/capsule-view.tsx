import Link from "next/link";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { PackingBack } from "./back-link";
import { WhyQuote } from "@/components/generate/why-quote";

export type CapsulePiece = { id: string; name: string; imageUrl: string };

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
}: {
  destination: string;
  dateRange: string;
  pieces: CapsulePiece[];
  dayCount: number;
  outfitCount: number;
  why: string;
  tripId: string;
  beyondHorizon: boolean;
}) {
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
          UI whispers. `surface-stage` is the design's radial stage, not a flat fill. */}
      <div className="mt-[14px] flex-1 px-[22px]">
        <div className="grid h-full grid-cols-3 grid-rows-3 gap-[10px] overflow-hidden rounded-[18px] p-[20px] surface-stage">
          {pieces.map((p) => (
            <Link key={p.id} href={`/closet/${p.id}`} className="grid place-items-center">
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
            </Link>
          ))}
        </div>
        <p className="mt-[11px] text-[10px] uppercase leading-[1.65] tracking-[0.13em] text-muted-foreground">
          {pieces.map((p) => p.name).join(" · ")}
        </p>
      </div>

      <div className="px-[22px]">
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

      <div className="sticky bottom-0 z-30 flex gap-3 bg-gradient-to-t from-canvas from-60% to-transparent px-[22px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[14px]">
        <Link
          href={`/packing/${tripId}/days`}
          className="flex-1 rounded-[12px] bg-foreground py-[17px] text-center font-semibold text-canvas"
        >
          See the days
        </Link>
      </div>
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
