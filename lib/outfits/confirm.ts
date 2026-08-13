/**
 * The evening wear confirmation — the decision, as a pure function.
 *
 * This exists because "Auto-log worn looks" was rejected twice: opening a look
 * is not wearing it, and `wear_logs` is the foundation of cost-per-wear,
 * streaks, most-worn, gathering-dust and gap analysis — i.e. of everything Pro
 * sells. Logging views as wears inflates all of it permanently, with no way
 * afterwards to tell a fabricated wear from a real one. Asking is the honest
 * version of the same idea, and it needs no push, so it is buildable today.
 *
 * Everything here is a value, so none of it needs a database to test.
 */

/** Local hour from which the day is over enough to ask about it. */
export const EVENING_HOUR = 18;

export type ViewedLook = { id: string; lookName: string; viewedAt: string };

export type ConfirmDecision =
  | { ask: false }
  | { ask: true; outfitId: string; lookName: string };

export function shouldAsk(args: {
  /** The user's LOCAL hour. Taking an hour rather than a Date is deliberate —
   *  a UTC hour would roll the question into the afternoon for eastern users,
   *  the same failure Decision 5 exists to prevent for the daily drop. */
  nowLocalHour: number;
  today: string;
  /** Set by BOTH answers. A No that leaves the question askable is a sheet that
   *  reappears until the user gives in — manufacturing the very data this
   *  feature exists to keep honest. */
  askedOn: string | null;
  hasWearToday: boolean;
  viewedToday: ViewedLook[];
}): ConfirmDecision {
  if (args.nowLocalHour < EVENING_HOUR) return { ask: false };
  if (args.askedOn === args.today) return { ask: false };
  // They already told us; asking again is noise.
  if (args.hasWearToday) return { ask: false };
  if (!args.viewedToday.length) return { ask: false };

  // Most recent, computed here rather than trusted from the caller's ordering —
  // the rule is "the last thing they looked at", not "whatever the query
  // happened to return first". Dwell time is not tracked, so most-recent is the
  // honest simple choice.
  const latest = args.viewedToday.reduce((a, b) => (a.viewedAt >= b.viewedAt ? a : b));

  return { ask: true, outfitId: latest.id, lookName: latest.lookName };
}
