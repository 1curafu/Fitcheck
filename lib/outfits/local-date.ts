/**
 * The user's local calendar date, as `YYYY-MM-DD`.
 *
 * This is the key of the daily look set. It must be LOCAL: keyed on the UTC
 * date, the drop would roll over mid-evening for eastern users and mid-morning
 * for western ones. `en-CA` is used purely because it formats as YYYY-MM-DD.
 */
export function localDateFor(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    // An unknown zone must never block generation — fall back to UTC.
    return now.toISOString().slice(0, 10);
  }
}

/**
 * The user's local hour, 0–23.
 *
 * Same reasoning as `localDateFor`, and the same fallback: the evening
 * confirmation asks after 18:00 LOCAL, so a UTC hour would put the question in
 * the afternoon for eastern users and after midnight for western ones.
 *
 * `hourCycle: "h23"` because the default for some locales is `h24`, which
 * renders midnight as "24" and would parse to an hour that never compares less
 * than the evening threshold.
 */
export function localHourFor(now: Date, timeZone: string): number {
  try {
    const hh = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now);
    return Number(hh);
  } catch {
    return now.getUTCHours();
  }
}
