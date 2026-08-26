import { maxWears } from "./rewear";

export type TripDay = { date: string; occasion: string };
export type CapsuleItem = { id: string; category: string };

/** Injected. Returns the best outfit for a day from `available`, or null. */
export type OutfitBuilder = (
  day: TripDay,
  available: CapsuleItem[],
) => { itemIds: string[]; score: number } | null;

export type CapsuleInput = {
  closet: CapsuleItem[];
  days: TripDay[];
  /** Re-wear meter position, 1–5. */
  level: number;
  /** Minimum outfit score for a day to count as covered. */
  floor: number;
  /** Item ids the user insists on bringing. */
  pinned?: string[];
  /** Item ids the user has removed. */
  excluded?: string[];
  build: OutfitBuilder;
};

export type CapsuleResult = {
  itemIds: string[];
  covered: { day: TripDay; itemIds: string[] }[];
  uncovered: TripDay[];
};

/**
 * Choose the smallest set of pieces that can dress every day of a trip.
 *
 * ⚠️ **NOT textbook greedy set-cover, and that is deliberate — textbook does not
 * work here.** Classic greedy adds the single item covering the most uncovered
 * days. An outfit is CONJUNCTIVE (a top AND a bottom AND shoes), so no single
 * item covers any day until all three categories are present: every candidate
 * scores a gain of zero on the first pass and the loop exits having covered
 * nothing. This was caught while reviewing the plan, before it was written.
 * **Do not "simplify" it back.**
 *
 * Instead: walk the days in order, and dress each one first from the pieces
 * already chosen (free), falling back to the whole closet (which costs whatever
 * new pieces the outfit introduces). Re-use is preferred structurally rather
 * than by a scoring heuristic.
 *
 * ⚠️ A day counts as covered only if its outfit clears `floor`. Without that the
 * solve buys a small suitcase with a bad Wednesday — and the capsule is supposed
 * to be the smallest set SUBJECT TO every day still being good.
 *
 * ⚠️ Days are processed in date order, so the result is stable. A stored capsule
 * must not change on a second read — that is Decision 5's whole premise.
 *
 * Known limit, stated honestly: this does not minimise as aggressively as an
 * exhaustive search would. It is understandable, deterministic and fast, which
 * matters more at wardrobe scale than the last piece of optimality.
 */
export function solveCapsule(input: CapsuleInput): CapsuleResult {
  const { closet, days, level, floor, build } = input;
  const excluded = new Set(input.excluded ?? []);
  const eligible = closet.filter((i) => !excluded.has(i.id));

  // Pins are seeded before anything else — they are in the suitcase either way,
  // so the rest of the capsule is chosen AROUND them at zero cost. An exclusion
  // wins over a pin: the user removed it more recently than they pinned it.
  const pinnedIds = new Set((input.pinned ?? []).filter((id) => !excluded.has(id)));
  const chosen: CapsuleItem[] = eligible.filter((i) => pinnedIds.has(i.id));

  const assigned = new Map<string, string[]>();
  const wears = new Map<string, number>();
  const limitFor = (item: CapsuleItem) => maxWears(item.category, level, days.length);

  /** Best outfit for a day from `pool`, honouring per-item wear limits and the floor. */
  const outfitFor = (day: TripDay, pool: CapsuleItem[]) => {
    const withCapacity = pool.filter((i) => (wears.get(i.id) ?? 0) < limitFor(i));
    const built = build(day, withCapacity);
    return built && built.score >= floor ? built : null;
  };

  const commit = (day: TripDay, itemIds: string[]) => {
    assigned.set(day.date, itemIds);
    for (const id of itemIds) wears.set(id, (wears.get(id) ?? 0) + 1);
  };

  for (const day of days) {
    // 1. Free: dress this day from the pieces already going in the case.
    const reused = outfitFor(day, chosen);
    if (reused) {
      commit(day, reused.itemIds);
      continue;
    }

    // 2. Costed: fall back to the whole closet and take on whatever it adds.
    const fresh = outfitFor(day, eligible);
    if (!fresh) continue; // nothing can dress this day — it lands in `uncovered`

    for (const id of fresh.itemIds) {
      if (chosen.some((c) => c.id === id)) continue;
      const item = eligible.find((i) => i.id === id);
      if (item) chosen.push(item);
    }
    commit(day, fresh.itemIds);
  }

  // Report only pieces actually worn, plus pins. A piece the solve picked up and
  // then never used would be dead weight in the suitcase.
  const worn = new Set([...assigned.values()].flat());
  const itemIds = chosen.filter((i) => worn.has(i.id) || pinnedIds.has(i.id)).map((i) => i.id);

  return {
    itemIds,
    covered: days
      .filter((d) => assigned.has(d.date))
      .map((d) => ({ day: d, itemIds: assigned.get(d.date)! })),
    uncovered: days.filter((d) => !assigned.has(d.date)),
  };
}
