/**
 * The three tiles at the top of item detail (Fitcheck.dc.html:609-627).
 *
 * The wear rows behind this come from `wear_logs` joined through `outfit_items`
 * — a wear is logged against an OUTFIT, so an item's wear count is "how many
 * logged outfits contained it".
 */

/**
 * Euro, formatted for the English UI — "€50.00", not "50,00 €".
 *
 * `en-IE` is the euro locale whose conventions match the rest of the interface;
 * the German content the spec plans will want `de-DE` here. One hard-coded
 * currency beats a fake one until Settings owns the choice.
 */
const MONEY = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/**
 * Whole calendar days between two `YYYY-MM-DD` keys.
 *
 * Built from the date parts via `Date.UTC` rather than parsing the strings as
 * local timestamps: `worn_on` is a DATE in the user's local calendar, and
 * subtracting two local timestamps across a DST change yields 23 or 25 hours,
 * which rounds to the wrong number of days.
 */
function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/**
 * Cost-per-wear is null rather than 0 or "—" when there is no price or no
 * wears: dividing by zero wears would print £Infinity, and showing £0.00 for an
 * unpriced item states something false. The UI hides the tile instead.
 */
export function itemWearStats(
  logs: { worn_on: string }[],
  price: number | null,
  today: string,
): { wears: number; costPerWear: string | null; lastWorn: string } {
  const wears = logs.length;
  const costPerWear = price != null && wears > 0 ? MONEY.format(price / wears) : null;

  if (!wears) return { wears, costPerWear, lastWorn: "Never" };

  const latest = logs.reduce((a, b) => (a.worn_on > b.worn_on ? a : b)).worn_on;
  const d = daysBetween(latest, today);
  // `d <= 0` also covers a log dated ahead of today — possible if the device
  // clock or timezone moved. "Today" is the honest reading; a negative count
  // would not be.
  const lastWorn = d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
  return { wears, costPerWear, lastWorn };
}
