import { expect, it } from "vitest";
import { statusLine, subscriptionFromRow } from "../status-line";

const end = "2026-10-12T08:00:00.000Z";
it("active renews", () =>
  expect(statusLine({ status: "active", interval: "month", currentPeriodEnd: end, cancelAtPeriodEnd: false }, "en-GB")).toBe(
    "Pro · Monthly — renews 12 Oct",
  ));
it("cancelling ends", () =>
  expect(statusLine({ status: "active", interval: "year", currentPeriodEnd: end, cancelAtPeriodEnd: true }, "en-GB")).toBe(
    "Pro until 12 Oct",
  ));
it("past_due asks for a card but is still Pro", () =>
  expect(statusLine({ status: "past_due", interval: "month", currentPeriodEnd: end, cancelAtPeriodEnd: false }, "en-GB")).toBe(
    "Payment failed — update your card",
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
