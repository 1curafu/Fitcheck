function shiftDay(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive days with at least one wear, counting back from today.
 *
 * A streak ending YESTERDAY still counts. Anchoring strictly on today would
 * show every user a zero every morning until they dressed, which reads as
 * "you lost your streak" rather than "the day is young".
 *
 * Counting always starts at today even when the diary is showing an older
 * month — a streak that changed as you paged backwards would be measuring the
 * view rather than the habit.
 *
 * Dates are UTC-shifted only for arithmetic; the values themselves are the
 * user's local date keys, so no timezone conversion happens here.
 */
export function currentStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;

  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = shiftDay(cursor, -1);
  }
  return n;
}
