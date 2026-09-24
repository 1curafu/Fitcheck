import { describe, expect, it } from "vitest";
import { tierForStatus, pickSubscription, toBillingState, FREE_STATE, type SubscriptionLike } from "../stripe/status";

const sub = (id: string, status: string, end: number, interval = "month", cancel = false): SubscriptionLike => ({
  id, status, cancel_at_period_end: cancel, cancel_at: null,
  items: { data: [{ current_period_end: end, price: { recurring: { interval } } }] },
});

describe("tierForStatus", () => {
  it.each(["active", "trialing", "past_due"])("%s grants Pro", (s) => expect(tierForStatus(s)).toBe("pro"));
  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", "something_new"])(
    "%s is free", (s) => expect(tierForStatus(s)).toBe("free"));
  it("no subscription is free", () => expect(tierForStatus(null)).toBe("free"));
});

describe("pickSubscription", () => {
  it("returns null for none", () => expect(pickSubscription([])).toBeNull());
  it("prefers a Pro-granting subscription over a newer canceled one", () => {
    expect(pickSubscription([sub("a", "canceled", 900), sub("b", "past_due", 100)])?.id).toBe("b");
  });
  it("among Pro-granting ones takes the latest period end", () => {
    expect(pickSubscription([sub("a", "active", 100), sub("b", "active", 200)])?.id).toBe("b");
  });
  it("with no Pro-granting one, takes the latest period end (for display)", () => {
    expect(pickSubscription([sub("a", "canceled", 100), sub("b", "unpaid", 300)])?.id).toBe("b");
  });
});

describe("toBillingState", () => {
  it("maps a subscription", () => {
    expect(toBillingState(sub("sub_1", "active", 1_760_000_000, "year", true))).toEqual({
      subscriptionId: "sub_1", status: "active", interval: "year",
      currentPeriodEnd: new Date(1_760_000_000 * 1000).toISOString(), cancelAtPeriodEnd: true, tier: "pro",
    });
  });
  it("null is the free state", () => expect(toBillingState(null)).toEqual(FREE_STATE));
  // Found in the sandbox run: in this API version the Customer Portal schedules a cancellation by setting `cancel_at`
  // to the period end and leaves `cancel_at_period_end` false. Reading only the flag kept "renews" on screen.
  it("a portal cancellation (cancel_at, flag false) is a scheduled cancellation ending at cancel_at", () => {
    const state = toBillingState({ ...sub("s", "active", 1_792_834_666), cancel_at: 1_792_834_666 });
    expect(state.cancelAtPeriodEnd).toBe(true);
    expect(state.currentPeriodEnd).toBe(new Date(1_792_834_666 * 1000).toISOString());
    expect(state.tier).toBe("pro");
  });
  it("a cancel_at before the period end is the date Pro ends — never the later period end", () => {
    const state = toBillingState({ ...sub("s", "active", 1_800_000_000), cancel_at: 1_790_000_000 });
    expect(state.cancelAtPeriodEnd).toBe(true);
    expect(state.currentPeriodEnd).toBe(new Date(1_790_000_000 * 1000).toISOString());
  });
  it("an unexpected interval is stored as null, never guessed", () => {
    expect(toBillingState(sub("s", "active", 1, "week")).interval).toBeNull();
  });
});
