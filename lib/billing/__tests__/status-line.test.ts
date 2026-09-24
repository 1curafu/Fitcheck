import { expect, it } from "vitest";
import { statusLine, subscriptionFromRow } from "../status-line";

const end = "2026-10-12T08:00:00.000Z";
it("active renews", () =>
  expect(statusLine({ status: "active", interval: "month", currentPeriodEnd: end, cancelAtPeriodEnd: false })).toBe(
    "Pro · Monthly — renews 12 Oct 2026",
  ));
it("cancelling ends", () =>
  expect(statusLine({ status: "active", interval: "year", currentPeriodEnd: end, cancelAtPeriodEnd: true })).toBe(
    "Pro until 12 Oct 2026",
  ));
it("past_due asks for a card but is still Pro", () =>
  expect(statusLine({ status: "past_due", interval: "month", currentPeriodEnd: end, cancelAtPeriodEnd: false })).toBe(
    "Payment failed — update your card",
  ));
it("the renewal date is the same on server and phone: UTC day, no locale formatter (review I1)", () =>
  expect(statusLine({ status: "active", interval: "month", currentPeriodEnd: "2026-10-12T23:30:00.000Z", cancelAtPeriodEnd: false })).toBe(
    "Pro · Monthly — renews 12 Oct 2026",
  ));
// Node's ICU writes "Sept" for en-GB where Safari writes "Sep" — Intl text is not stable across engines, and the
// mismatch broke hydration on the first real sandbox purchase. The year is there because an annual plan bought today
// otherwise reads "renews 24 Sep" — today's date.
it("September is 'Sep' in every engine, and the year is shown", () =>
  expect(statusLine({ status: "active", interval: "year", currentPeriodEnd: "2027-09-24T09:37:50.000Z", cancelAtPeriodEnd: false })).toBe(
    "Pro · Annual — renews 24 Sep 2027",
  ));
it("no subscription has no line", () =>
  expect(statusLine({ status: null, interval: null, currentPeriodEnd: null, cancelAtPeriodEnd: false })).toBeNull());

it("a row becomes a summary only for Pro", () => {
  const row = {
    tier: "pro", subscription_status: "active", subscription_interval: "year",
    current_period_end: "2026-10-12T08:00:00.000Z", cancel_at_period_end: true,
  };
  expect(subscriptionFromRow(row)).toEqual({
    status: "active", interval: "year", currentPeriodEnd: "2026-10-12T08:00:00.000Z", cancelAtPeriodEnd: true,
  });
  expect(subscriptionFromRow({ ...row, tier: "free" })).toBeNull();
  expect(subscriptionFromRow(null)).toBeNull();
  expect(subscriptionFromRow({ ...row, subscription_interval: "week" })?.interval).toBeNull();
});
