/**
 * Whole calendar days between two `YYYY-MM-DD` keys.
 *
 * Built from the date parts via `Date.UTC` rather than parsing the strings as
 * local timestamps: `worn_on` is a DATE in the user's local calendar, and
 * subtracting two local timestamps across a DST change yields 23 or 25 hours,
 * which rounds to the wrong number of days.
 *
 * Shared by the item-detail tiles ("14 days ago") and the stats screen's
 * gathering-dust list. It was written once for the former and must not be
 * written a second time for the latter — the DST care above is exactly the kind
 * of detail a re-implementation loses.
 */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}
