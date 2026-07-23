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
