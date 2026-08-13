import { expect, test } from "vitest";
import { shouldAsk, EVENING_HOUR } from "../confirm";

const base = {
  nowLocalHour: 20,
  today: "2026-08-13",
  askedOn: null as string | null,
  hasWearToday: false,
  viewedToday: [
    { id: "a", lookName: "Crisp Oxford", viewedAt: "2026-08-13T09:00:00Z" },
    { id: "b", lookName: "Navy & Black", viewedAt: "2026-08-13T17:00:00Z" },
  ],
};

test("it does not ask before the evening", () => {
  expect(shouldAsk({ ...base, nowLocalHour: 14 }).ask).toBe(false);
  expect(shouldAsk({ ...base, nowLocalHour: EVENING_HOUR - 1 }).ask).toBe(false);
  expect(shouldAsk({ ...base, nowLocalHour: EVENING_HOUR }).ask).toBe(true);
});

test("it does not ask when nothing was opened today", () => {
  // The whole reason auto-log was rejected: never ask about a look the user
  // never saw, because a Yes there is a fabricated wear — and wear_logs is the
  // foundation of cost-per-wear, streaks and gap analysis.
  expect(shouldAsk({ ...base, viewedToday: [] }).ask).toBe(false);
});

test("it does not ask when a wear is already logged today", () => {
  // They already told us. Asking again is noise, and a second Yes would be a
  // no-op against the unique index anyway.
  expect(shouldAsk({ ...base, hasWearToday: true }).ask).toBe(false);
});

test("it asks once per day, whichever way it was answered", () => {
  // `askedOn` is set by BOTH Yes and No. A No that leaves the question askable
  // is a sheet that reappears until the user gives in and says Yes — which
  // manufactures exactly the data this feature exists to keep honest.
  expect(shouldAsk({ ...base, askedOn: base.today }).ask).toBe(false);
  expect(shouldAsk({ ...base, askedOn: "2026-08-12" }).ask).toBe(true);
});

test("it asks about the MOST RECENTLY opened look", () => {
  // Dwell time is not tracked, so most-recent is the honest simple choice
  // rather than a guess at which one they liked.
  expect(shouldAsk(base)).toMatchObject({ ask: true, outfitId: "b", lookName: "Navy & Black" });
});

test("input order does not decide the answer", () => {
  // The route's ordering must not be load-bearing — the rule is "most recent",
  // not "whatever the query returned first".
  const reversed = { ...base, viewedToday: [...base.viewedToday].reverse() };
  expect(shouldAsk(reversed)).toMatchObject({ outfitId: "b" });
});

test("a single opened look is asked about without special-casing", () => {
  const one = { ...base, viewedToday: [base.viewedToday[0]!] };
  expect(shouldAsk(one)).toMatchObject({ ask: true, outfitId: "a" });
});

test("the evening boundary is the caller's LOCAL hour, never UTC", () => {
  // A UTC hour would roll the question into the afternoon for eastern users —
  // the same failure Decision 5 exists to prevent for the daily drop. This
  // function takes an hour rather than a Date so it cannot get that wrong; the
  // test pins the contract.
  expect(shouldAsk({ ...base, nowLocalHour: 23 }).ask).toBe(true);
  expect(shouldAsk({ ...base, nowLocalHour: 0 }).ask).toBe(false);
});
