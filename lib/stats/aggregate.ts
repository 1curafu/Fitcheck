import { formatMoney } from "@/lib/format/money";
import { daysBetween } from "@/lib/format/days";

/**
 * The aggregates behind `/stats` (Fitcheck.dc.html:737-780).
 *
 * Pure functions over rows the caller has already fetched — no Supabase here,
 * so every number on that screen is testable without a database. There is no AI
 * call anywhere on this screen, including the gap analysis (see ./gap.ts).
 */

type PricedItem = { id: string; price: number | null };

/**
 * `price` is nullable and most closets are mostly null: the tagger cannot read
 * a price off a photograph, so it is only ever there because the user typed it.
 * Every total therefore has to mean "of the pieces we know about", and the
 * screen has to be honest that it is not the whole wardrobe.
 */
export function closetStats(
  items: PricedItem[],
  logs: { item_id: string }[],
): { value: string; totalWears: number; avgCostPerWear: string | null } {
  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0);
  const totalWears = logs.length;
  return {
    value: formatMoney(total),
    totalWears,
    // Null rather than 0 or "€0.00" on either empty branch. Dividing by zero
    // wears prints €Infinity, and €0.00 for an unpriced closet states something
    // false — the UI hides the tile instead. Same stance as `itemWearStats`.
    avgCostPerWear: totalWears > 0 && total > 0 ? formatMoney(total / totalWears) : null,
  };
}

/** The n most-worn item ids, highest first. Pieces with no wears are excluded. */
export function mostWorn(items: PricedItem[], wearsById: Record<string, number>, n: number): string[] {
  return items
    .map((i) => ({ id: i.id, wears: wearsById[i.id] ?? 0 }))
    .filter((i) => i.wears > 0)
    .sort((a, b) => b.wears - a.wears)
    .slice(0, n)
    .map((i) => i.id);
}

/**
 * The n longest-idle pieces, with how many days it has been.
 *
 * A never-worn item is the whole point of the section, not a gap in the data —
 * the pieces you never reach for are exactly the ones with no wear rows. They
 * sort FIRST, above anything merely worn a long time ago, because "you have
 * never worn this" is the stronger version of the same statement.
 *
 * ⚠️ `days` is `null` for those, not `Infinity`. Infinity sorts correctly and
 * then reaches the screen as "∞ days ago"; null forces the UI to say "Never
 * worn", which is both true and the more damning line.
 */
export function gatheringDust(
  items: PricedItem[],
  lastWornById: Record<string, string>,
  today: string,
  n: number,
): { id: string; days: number | null }[] {
  return items
    .map((i) => {
      const last = lastWornById[i.id];
      return { id: i.id, days: last ? daysBetween(last, today) : null };
    })
    .sort((a, b) => (b.days ?? Number.POSITIVE_INFINITY) - (a.days ?? Number.POSITIVE_INFINITY))
    .slice(0, n);
}
