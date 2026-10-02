import { buildCandidates, eligibleByCategory, type CandidateItem } from "@/lib/generator/candidates";
import type { NoGo } from "@/lib/generator/nogos";
import { rankTopN } from "@/lib/generator/rank";
import { scoreCombo, type ScoreItem } from "@/lib/generator/score";
import { personalBand, OUTERWEAR_C, planningTemp, type Weather } from "@/lib/generator/rules";
import { QUALITY_FLOOR, type OutfitBuilder, type TripDay, type CapsuleItem, type DayContext } from "./capsule";

/** The occasion given to a day the mix does not reach. */
const FILLER_OCCASION = "everyday";

/**
 * Turn a date range and an occasion mix into an ordered list of days.
 *
 * ⚠️ **Deterministic, and that is load-bearing.** A stored capsule is re-read
 * all week — on the sofa, at the airport, in the hotel — and its days must not
 * shuffle underneath it. Same reason `solveCapsule` walks days in order.
 *
 * ⚠️ **Dates are handled as local calendar strings, never as instants.** Adding
 * 24h to a `Date` crosses a DST boundary wrongly and either repeats or skips a
 * day; `lib/outfits/local-date.ts` exists because that bug already happened once
 * in this codebase.
 *
 * A mix that does not add up to the range is the NORMAL case — the user is
 * still moving the steppers — so it pads with everyday and truncates rather
 * than throwing.
 */
export function expandDays(
  start: string,
  end: string,
  mix: Record<string, number>,
): TripDay[] {
  const dates = datesBetween(start, end);

  // Occasions are laid out in the mix's own key order, so re-reading the same
  // stored mix produces the same schedule.
  const occasions: string[] = [];
  for (const [occasion, count] of Object.entries(mix)) {
    for (let i = 0; i < Math.max(0, Math.floor(count)); i++) occasions.push(occasion);
  }

  return dates.map((date, i) => ({ date, occasion: occasions[i] ?? FILLER_OCCASION }));
}

/** Inclusive calendar days from `start` to `end`, as `YYYY-MM-DD`. */
function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  // UTC arithmetic on a date-only value: no local offset means no DST to cross.
  // The strings are calendar days, so this never becomes an instant.
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return [];

  while (cursor.getTime() <= last.getTime()) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * The real outfit builder: the generator's candidates, scored by the generator.
 *
 * This is the impure half of the capsule engine — it is what `solveCapsule`'s
 * injected `build` parameter exists for, so the solve itself never imports
 * `lib/generator/` and stays unit-testable without a database.
 *
 * ⚠️ **The forecast is read PER DAY.** The generator audit found one defect in
 * three places from reading a single moment for a look worn all day; a trip
 * spans a week, which makes it worse, not better.
 */
export type PlannerOpts = {
  aesthetic?: string[];
  rainGuard?: boolean;
  nogos?: readonly NoGo[];
  keepItemIds?: readonly string[];
  /** The quiz palette and fit answers — very soft score terms. */
  palette?: string | null;
  fitPref?: string | null;
  dressCodes?: { formality_min?: number | null; formality_max?: number | null };
};

export type TripPlanner = {
  build: OutfitBuilder;
  usableToday: (day: TripDay, itemId: string, reference: CapsuleItem[]) => boolean;
  requiredToday: (day: TripDay, reference: CapsuleItem[]) => string[];
};

/**
 * Build and judge trip outfits from one memoised eligibility pass per day and reference.
 * A packed subset cannot relieve a weather bar that the whole capacity-aware closet would not (trip-comfort §2–§4).
 */
export function tripPlanner(
  closet: CandidateItem[],
  forecastFor: (date: string) => Weather,
  opts?: PlannerOpts,
): TripPlanner {
  const byId = new Map(closet.map((i) => [i.id, i]));
  const resolve = (pieces: CapsuleItem[]) => pieces.flatMap((p) => {
    const full = byId.get(p.id);
    return full ? [full] : [];
  });
  const argsFor = (day: TripDay) => ({
    band: personalBand(day.occasion as Parameters<typeof personalBand>[0], opts?.dressCodes ?? null),
    weather: forecastFor(day.date),
    excludeItemIds: [] as string[],
    maxAccessories: 1,
    maxBags: 1,
    rainGuard: opts?.rainGuard,
    nogos: opts?.nogos,
    keepItemIds: opts?.keepItemIds,
  });
  const memo = new Map<string, Set<string>>();
  const allowed = (day: TripDay, reference: CapsuleItem[], args?: ReturnType<typeof argsFor>) => {
    const key = `${day.date}|${day.occasion}|${reference.map((r) => r.id).sort().join(",")}`;
    let hit = memo.get(key);
    if (!hit) {
      hit = new Set(Object.values(eligibleByCategory(resolve(reference), args ?? argsFor(day))).flat().map((i) => i.id));
      memo.set(key, hit);
    }
    return hit;
  };

  const build: OutfitBuilder = (day, available, recent, dayContext?: DayContext) => {
    const args = argsFor(day);
    const ok = allowed(day, dayContext?.reference ?? available, args);
    const pool = resolve(available).filter((i) => ok.has(i.id));
    if (pool.length === 0) return null;

    const { band, weather } = args;
    const combos = buildCandidates(pool, args);
    if (combos.length === 0) return null;

    /**
     * ⚠️ `rankTopN`, not a bare `scoreCombo` loop, because it already carries the
     * recency preference: `RECENT_WEIGHT = 0.25` applied in proportion to how
     * many pieces repeat, and documented there as "a preference, never an
     * eliminator". Reused rather than reinvented.
     *
     * `recent` arrives only when the solve is choosing among pieces already
     * packed, so varying a day can never cost a piece — see `solveCapsule`.
     */
    const ctx = {
      aesthetic: opts?.aesthetic ?? [],
      band,
      tempC: weather.highC ?? weather.tempC,
      // Quiz part 2 — the same very soft preferences the daily stylist uses.
      palette: opts?.palette ?? null,
      fitPref: opts?.fitPref ?? null,
    };

    const ranked = rankTopN(combos as unknown as (ScoreItem & { id: string })[][], {
      ...ctx,
      recentlyShown: recent,
    }, combos.length);
    const floorCtx = { ...ctx, palette: null, fitPref: null };
    // Ranking preferences can lift a sub-floor look above a qualifying one.
    // Choose the first qualifying survivor of the registry in preference order;
    // retain the best candidate when none qualifies so the solve rejects it.
    const top = ranked.find(({ items }) => scoreCombo(items, floorCtx) >= QUALITY_FLOOR) ?? ranked[0];
    if (!top) return null;

    /**
     * ⚠️ **The recency preference ORDERS, it does not score.** `rankTopN`
     * subtracts up to `RECENT_WEIGHT` (0.25) for repeated pieces — and the
     * caller compares the returned score against `QUALITY_FLOOR` (0.7). Return
     * the penalised number and a fully-repeated outfit sinks below the floor,
     * the "dress it from what is already packed" branch fails, and the solve
     * BUYS A PIECE to escape its own variety nudge.
     *
     * Measured, not theorised: it took the real closet's 7-day capsule from six
     * pieces to seven while the days still repeated — worse on both counts.
     * So the winner is re-scored WITHOUT the penalty before it is returned.
     */
    return {
      itemIds: top.items.map((i) => i.id),
      // The floor score WITHOUT the quiz preferences: they steer which look wins, but QUALITY_FLOOR was calibrated
      // without them, so a soft preference must never be able to push a good look under it (Opus review).
      score: scoreCombo(top.items, floorCtx),
    };
  };

  return {
    build,
    usableToday: (day, itemId, reference) => allowed(day, reference).has(itemId),
    requiredToday: (day, reference) =>
      planningTemp(forecastFor(day.date)) < OUTERWEAR_C &&
      [...allowed(day, reference)].some((id) => byId.get(id)?.category === "Outerwear")
        ? ["Outerwear"]
        : [],
  };
}

/** Compatibility for scripts and standalone builders whose offered pool is its own reference. */
export function realBuilder(
  closet: CandidateItem[],
  forecastFor: (date: string) => Weather,
  opts?: PlannerOpts,
): OutfitBuilder {
  return tripPlanner(closet, forecastFor, opts).build;
}
