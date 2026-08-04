import Link from "next/link";
import type { CSSProperties } from "react";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { Cell, DiaryPiece } from "@/lib/diary/month";

/** Monday-first, matching `buildMonth`'s leading pad. */
const DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Flame() {
  return (
    <svg width="14" height="16" viewBox="0 0 24 28" fill="var(--color-brand)" aria-hidden="true">
      <path d="M12 0c2 5-3 7-3 12a3 3 0 006 0c0-1 0-2-1-3 3 2 5 5 5 9a9 9 0 11-18 0c0-7 7-9 7-15 2 1 3 3 3 5 1-3 2-5 1-8z" />
    </svg>
  );
}

/** `2026-07-09` → `9 July` — the cell's accessible name. */
function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/**
 * A day's look, laid out with the same percentage geometry as the full-size
 * flat-lay — so the cell is a miniature of the screen it opens, not a second
 * layout system that can drift from it.
 */
function Thumbnail({ pieces }: { pieces: DiaryPiece[] }) {
  return (
    <>
      {pieces.map((p, i) => {
        const s = p.slot;
        const style: CSSProperties = {
          position: "absolute",
          left: `${s.xPct}%`,
          top: `${s.yPct}%`,
          width: `${s.wPct}%`,
          height: `${s.hPct}%`,
          zIndex: s.z,
          transform: `rotate(${s.rotationDeg}deg)`,
        };
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            // Not next/image: these are short-lived signed Supabase URLs, and the
            // optimizer caches by URL — a rotating signature would mean a paid
            // transformation per view. Same reasoning as the closet card.
            key={`${p.imageUrl}-${i}`}
            src={p.imageUrl}
            alt=""
            role="presentation"
            loading="lazy"
            decoding="async"
            className="object-contain"
            style={style}
          />
        );
      })}
    </>
  );
}

function DayCell({ cell }: { cell: Cell }) {
  if (!cell.inMonth) return <div aria-hidden="true" />;

  const worn = Boolean(cell.log);
  const body = (
    <>
      {cell.log && <Thumbnail pieces={cell.log.pieces} />}
      {/* EVERY day sits in the same corner at the same size, logged or not.
          The design centres the number on an empty cell and corners it on a
          full one, but in a real month most cells are empty, so the few logged
          days read as the ones that are misaligned — the grid looks unsettled
          rather than composed. One position, one size; only the colour changes.

          Positioned inline, not by utility class, for the same reason the
          cutouts are: the offsets must land whatever the CSS pipeline does.
          A bare `absolute` with no resolved offset falls back to its static
          position — which inside a centring flex box was the middle of the
          cell, straight across the look.

          `zIndex` is load-bearing too: the cutouts carry their own z (1-3), so
          an unstacked number is painted OVER by them. The corner it sits in is
          reserved by THUMB_SLOTS, so it never lands on a garment; the shadow
          only insures it against a pale piece drifting under it. */}
      <span
        className={worn ? "text-foreground/70" : "text-muted-dim"}
        style={{
          position: "absolute",
          bottom: 4,
          right: 5,
          zIndex: 10,
          fontSize: 10,
          textShadow: worn ? "0 1px 3px rgba(0,0,0,0.95)" : undefined,
        }}
      >
        {cell.day}
      </span>
    </>
  );

  // Today is ringed in rust — the screen's one rust element besides the streak
  // flame, both of which are the same "you, now" signal.
  const shell = [
    // No flex: every child is absolutely positioned now, and a centring flex
    // box is what the day number silently fell back into when its offsets
    // failed to resolve.
    "relative block aspect-[0.82] overflow-hidden rounded-[10px]",
    worn ? "bg-surface-2" : "bg-surface-1",
    cell.isToday
      ? "shadow-[inset_0_0_0_1.5px_var(--color-brand)]"
      : "shadow-[inset_0_0_0_1px_var(--hairline-2)]",
  ].join(" ");

  // A wear outlives its outfit (`wear_logs.outfit_id` is ON DELETE SET NULL), so
  // a logged day is only a link when there is still something to open.
  if (cell.log?.outfitId) {
    return (
      <Link
        href={`/outfits/${cell.log.outfitId}`}
        aria-label={dayLabel(cell.key)}
        data-testid={`cell-${cell.key}`}
        className={shell}
      >
        {body}
      </Link>
    );
  }
  return (
    <div data-testid={`cell-${cell.key}`} className={shell}>
      {body}
    </div>
  );
}

/**
 * The Fit Diary (`Fitcheck.dc.html:436-477`) — a month of what you actually
 * wore. Presentational: every date here is already the user's local date key,
 * decided by the route.
 */
export function DiaryGrid({
  cells,
  monthLabel,
  streak,
  prevHref,
  nextHref,
}: {
  cells: Cell[];
  monthLabel: string;
  streak: number;
  prevHref: string;
  nextHref: string;
}) {
  const hasWears = cells.some((c) => c.log);

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <div className="screen-top px-[22px] pb-[6px]">
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={prevHref}
                aria-label="Previous month"
                className="grid size-6 shrink-0 place-items-center rounded-full text-muted-dim"
              >
                ‹
              </Link>
              <Kicker className="truncate">{monthLabel}</Kicker>
              <Link
                href={nextHref}
                aria-label="Next month"
                className="grid size-6 shrink-0 place-items-center rounded-full text-muted-dim"
              >
                ›
              </Link>
            </div>
            <h1 className="mt-1 font-serif text-[34px]/[1] text-foreground">Fit Diary</h1>
          </div>

          {/* Hidden at zero: "0 days" congratulates you on nothing. */}
          {streak > 0 && (
            <div
              data-testid="streak-pill"
              className="flex shrink-0 items-center gap-2 rounded-full px-[14px] py-[9px] shadow-[inset_0_0_0_1px_rgba(184,106,71,0.25)] [background:linear-gradient(120deg,#211c19,#191518)]"
            >
              <Flame />
              <div>
                <span className="font-serif text-[18px] text-foreground">{streak}</span>
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {streak === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[18px] pb-[120px] pt-[18px]">
        <div
          data-testid="weekday-header"
          className="mb-2 grid grid-cols-7 gap-[7px] text-center text-[10px] uppercase tracking-[0.1em] text-muted-dim"
        >
          {DOWS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[7px]">
          {cells.map((c) => (
            <DayCell key={c.key} cell={c} />
          ))}
        </div>

        {!hasWears && (
          <div className="mt-[22px] flex items-center gap-[14px] rounded-[14px] bg-surface-1 px-[18px] py-4 shadow-[inset_0_0_0_1px_var(--hairline-2)]">
            <p className="font-serif text-[16px]/[1.4] italic text-muted-foreground text-pretty">
              Wear a look from today&rsquo;s set and it lands here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
