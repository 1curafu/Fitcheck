export type WearRow = { worn_on: string; outfit_id: string | null; created_at: string | null };

/**
 * `?m=YYYY-MM` → a year and a 1-12 month, falling back to today's.
 *
 * The parameter is user-controlled and reaches a `Date` constructor, so anything
 * that is not exactly a real month is rejected rather than coerced — `2026-13`
 * would otherwise silently render January 2027.
 */
export function parseMonth(m: string | undefined, today: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(m ?? "");
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year > 0 && month >= 1 && month <= 12) return { year, month };
  }
  const [y, mo] = today.split("-").map(Number);
  return { year: y, month: mo };
}

/** Inclusive date keys for a `worn_on BETWEEN` filter. */
export function monthBounds(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** The neighbouring month as a `?m` value, wrapping the year. */
export function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * One wear per day — the most recently logged.
 *
 * `wear_logs` permits several outfits on a date (the unique index is per
 * outfit, not per day) and a diary cell has room for one. `created_at` is
 * nullable, so a row without one sorts oldest rather than winning by accident.
 */
export function latestPerDay(rows: WearRow[]): WearRow[] {
  const byDay = new Map<string, WearRow>();
  for (const row of rows) {
    const held = byDay.get(row.worn_on);
    if (!held || (row.created_at ?? "") > (held.created_at ?? "")) byDay.set(row.worn_on, row);
  }
  return [...byDay.values()];
}
