/**
 * The three tiles at the top of item detail (Fitcheck.dc.html:609-627).
 *
 * The wear rows behind this come from `wear_logs` joined through `outfit_items`
 * — a wear is logged against an OUTFIT, so an item's wear count is "how many
 * logged outfits contained it".
 */

import { formatMoney } from "@/lib/format/money";
import { daysBetween } from "@/lib/format/days";

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
  const costPerWear = price != null && wears > 0 ? formatMoney(price / wears) : null;

  if (!wears) return { wears, costPerWear, lastWorn: "Never" };

  const latest = logs.reduce((a, b) => (a.worn_on > b.worn_on ? a : b)).worn_on;
  const d = daysBetween(latest, today);
  // `d <= 0` also covers a log dated ahead of today — possible if the device
  // clock or timezone moved. "Today" is the honest reading; a negative count
  // would not be.
  const lastWorn = d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
  return { wears, costPerWear, lastWorn };
}
