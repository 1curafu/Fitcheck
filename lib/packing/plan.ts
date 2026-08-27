import { buildCandidates, type CandidateItem } from "@/lib/generator/candidates";
import { rankTopN } from "@/lib/generator/rank";
import { scoreCombo, type ScoreItem } from "@/lib/generator/score";
import { occasionBand, type Weather } from "@/lib/generator/rules";
import type { OutfitBuilder, TripDay } from "./capsule";

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
export function realBuilder(
  closet: CandidateItem[],
  forecastFor: (date: string) => Weather,
  opts?: { aesthetic?: string[]; rainGuard?: boolean },
): OutfitBuilder {
  const byId = new Map(closet.map((i) => [i.id, i]));

  return (day, available, recent) => {
    const pool = available.flatMap((a) => {
      const full = byId.get(a.id);
      return full ? [full] : [];
    });
    if (pool.length === 0) return null;

    const band = occasionBand(day.occasion as Parameters<typeof occasionBand>[0]);
    const weather = forecastFor(day.date);

    const combos = buildCandidates(pool, {
      band,
      weather,
      excludeItemIds: [],
      maxAccessories: 1,
      rainGuard: opts?.rainGuard,
    });
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
    };

    const ranked = rankTopN(combos as unknown as (ScoreItem & { id: string })[][], {
      ...ctx,
      recentlyShown: recent,
    }, 1);
    const top = ranked[0];
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
      score: scoreCombo(top.items as unknown as ScoreItem[], ctx),
    };
  };
}
