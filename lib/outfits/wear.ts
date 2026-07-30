/**
 * Wear logging — the one write path every wear-derived surface reads from.
 *
 * Times worn, cost-per-wear, last worn, the Fit Diary grid, streaks, "most
 * worn" and "gathering dust" are all views over wear_logs. Nothing wrote to it
 * before this.
 */

/** The button states itself: an instruction before, a fact after. */
export function wearLabel(worn: boolean): string {
  return worn ? "Worn today" : "Wear this today";
}

/**
 * `worn_on` is a DATE column, compared against the user's LOCAL date key — a
 * UTC comparison would move an evening wear in an eastern timezone onto the
 * next day, which is the same class of bug the daily drop already avoids.
 */
export function isWornToday(logs: { worn_on: string }[], today: string): boolean {
  return logs.some((l) => l.worn_on === today);
}

/**
 * Where a regenerated set starts numbering, given the indices already pinned.
 *
 * A worn outfit is pinned: `saveDailyLooks` leaves it out of the day's delete so
 * that wearing a look and then regenerating cannot destroy what you actually
 * wore (the FK had no ON DELETE action, so it used to fail outright). But
 * `outfits_daily_unique` is `(user_id, occasion, generated_on, look_index)`, so
 * the fresh set has to be numbered past the survivors.
 *
 * Indices only ever move forward — gaps left by a previous regenerate are not
 * reused, because reusing one would collide with a look pinned in between.
 */
export function freshIndexStart(pinned: (number | null)[]): number {
  const used = pinned.filter((i): i is number => typeof i === "number");
  return used.length === 0 ? 0 : Math.max(...used) + 1;
}
