import type { CapsuleResult, TripDay } from "./capsule";

export type ScheduledDay = {
  day: TripDay;
  itemIds: string[];
  /** 1-based wear number per item, e.g. `{ shirt: 2 }` renders "2nd wear". */
  wearIndex: Record<string, number>;
};

/**
 * Turn a solved capsule into an ordered day list carrying wear numbers.
 *
 * ⚠️ **The wear numbers are the honesty of the whole feature.** Nine pieces
 * across seven days only looks credible when the screen can show WHY — "Oxford
 * shirt · 2nd wear" is the difference between a believable capsule and a
 * suspicious one. Without it a user counts four shirts against seven days and
 * stops trusting the output.
 *
 * Only covered days are scheduled. An uncovered day belongs to the shortfall
 * screen, and must never appear here as a day with an empty outfit.
 */
export function scheduleDays(result: CapsuleResult): ScheduledDay[] {
  const seen = new Map<string, number>();

  // `covered` is already in date order from the solve, and is preserved rather
  // than re-sorted so the two cannot disagree about what "first wear" means.
  return result.covered.map(({ day, itemIds }) => {
    const wearIndex: Record<string, number> = {};
    for (const id of itemIds) {
      const n = (seen.get(id) ?? 0) + 1;
      seen.set(id, n);
      wearIndex[id] = n;
    }
    return { day, itemIds, wearIndex };
  });
}
