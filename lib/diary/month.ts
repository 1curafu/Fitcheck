import type { Slot } from "@/lib/generator/types";

/** One cutout of a logged look, positioned by the flat-lay geometry. */
export type DiaryPiece = { imageUrl: string; slot: Slot };

/**
 * A day's wear, as the diary needs it.
 *
 * `outfitId` is nullable because `wear_logs.outfit_id` is `ON DELETE SET NULL`
 * (migration `20260730090000`) — deleting an outfit degrades to "wear kept,
 * outfit forgotten" rather than a FK violation. Such a day still fills a cell;
 * it just cannot link anywhere.
 */
export type DayLog = { worn_on: string; outfitId: string | null; pieces: DiaryPiece[] };

export type Cell = {
  key: string;
  day: number | null;
  inMonth: boolean;
  isToday: boolean;
  log?: DayLog;
};

/** Monday-first, matching the design's weekday header. */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The month grid. `month` is 1-12, not JS's 0-11 — the off-by-one there is a
 * classic and this boundary is the place to absorb it.
 *
 * `today` is passed in rather than read from the clock so the whole thing stays
 * pure and testable, and so the caller can supply the user's LOCAL date. Every
 * date in the diary is a local date key; comparing against a UTC one would
 * highlight the wrong cell all evening for eastern users.
 *
 * `Date.UTC` is used purely as calendar arithmetic — these are date keys, not
 * instants, so no timezone conversion is happening or wanted.
 */
export function buildMonth(year: number, month: number, today: string, logs: DayLog[]): Cell[] {
  const byDate = new Map(logs.map((l) => [l.worn_on, l]));
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = mondayIndex(first.getUTCDay());

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: `lead-${i}`, day: null, inMonth: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = iso(year, month, d);
    cells.push({
      key: date,
      day: d,
      inMonth: true,
      isToday: date === today,
      log: byDate.get(date),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, day: null, inMonth: false, isToday: false });
  }
  return cells;
}

/** `2026-07` → `July 2026`, for the header kicker. */
export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}
