import { describe, expect, it } from "vitest";
import { fakeGateway, fakeStore, sub } from "./fakes";
import { customerIdOf, handleStripeEvent, HANDLED_EVENT_TYPES } from "../stripe/webhook";

const bob = { userId: "u1", email: "b@x.y", stripeCustomerId: "cus_1", tier: "free" as const };
const evt = (id: string, type: string, object: unknown) => ({ id, type, data: { object } });

it.each([
  ["customer.subscription.updated", { customer: "cus_1" }],
  ["invoice.payment_failed", { customer: "cus_1" }],
  ["checkout.session.completed", { customer: { id: "cus_1" } }],
])("extracts the customer from %s", (type, object) => expect(customerIdOf(evt("e", type, object))).toBe("cus_1"));

it("syncs a handled event and records it", async () => {
  const { store, events, states } = fakeStore([bob]);
  const r = await handleStripeEvent(
    { store, gateway: fakeGateway({ cus_1: [sub("s", "active")] }) },
    evt("evt_1", "customer.subscription.created", { customer: "cus_1" }),
  );
  expect(r).toBe("synced");
  expect(events.has("evt_1")).toBe(true);
  expect(states.get("u1")?.tier).toBe("pro");
});

it("a second delivery of the same event is a no-op", async () => {
  const { store } = fakeStore([bob]);
  const gateway = fakeGateway({ cus_1: [sub("s", "active")] });
  const e = evt("evt_2", "invoice.paid", { customer: "cus_1" });
  await handleStripeEvent({ store, gateway }, e);
  await expect(handleStripeEvent({ store, gateway }, e)).resolves.toBe("duplicate");
  expect(gateway.listSubscriptions).toHaveBeenCalledTimes(1);
});

it("ignores unhandled types without touching Stripe", async () => {
  const gateway = fakeGateway();
  await expect(
    handleStripeEvent({ store: fakeStore([bob]).store, gateway }, evt("e3", "product.updated", {})),
  ).resolves.toBe("ignored");
  expect(gateway.listSubscriptions).not.toHaveBeenCalled();
});

it("an unknown customer is acknowledged and recorded (account deleted)", async () => {
  const { store, events } = fakeStore([]);
  await expect(
    handleStripeEvent({ store, gateway: fakeGateway() }, evt("e4", "customer.subscription.deleted", { customer: "cus_gone" })),
  ).resolves.toBe("unknown-customer");
  expect(events.has("e4")).toBe(true);
});

it("a failed sync does NOT mark the event processed, so Stripe's retry is not mistaken for a duplicate", async () => {
  const { store, events } = fakeStore([bob]);
  const gateway = fakeGateway();
  gateway.listSubscriptions.mockRejectedValue(new Error("stripe down"));
  await expect(handleStripeEvent({ store, gateway }, evt("e5", "invoice.paid", { customer: "cus_1" }))).rejects.toThrow();
  expect(events.has("e5")).toBe(false);
});

// Owner decision 2026-09-24: a refund must never leave a free subscription behind. A refund and a cancellation
// are separate in Stripe, and entitlement follows the subscription — so a FULL refund cancels immediately.
describe("a fully refunded payment ends the subscription", () => {
  const pro = { ...bob, tier: "pro" as const };
  /** Cancelling really cancels, so the post-cancel check and the sync see the new state. */
  const liveGateway = (status: string) => {
    const subs = [sub("s_pro", status)];
    const gateway = fakeGateway({ cus_1: subs });
    gateway.cancelSubscriptionNow.mockImplementation(async (id) => {
      for (const s of subs) if (s.id === id) s.status = "canceled";
    });
    return gateway;
  };

  it("is a handled event", () => expect(HANDLED_EVENT_TYPES.has("charge.refunded")).toBe(true));

  it("full refund: cancels immediately, then syncs the user to free", async () => {
    const { store, states, events } = fakeStore([pro]);
    const gateway = liveGateway("active");
    await expect(
      handleStripeEvent({ store, gateway }, evt("e6", "charge.refunded", { customer: "cus_1", refunded: true })),
    ).resolves.toBe("synced");
    expect(gateway.cancelSubscriptionNow).toHaveBeenCalledWith("s_pro");
    expect(states.get("u1")?.tier).toBe("free");
    expect(events.has("e6")).toBe(true);
  });

  it("partial refund: the subscription is left alone", async () => {
    const { store, states } = fakeStore([pro]);
    const gateway = liveGateway("active");
    await handleStripeEvent({ store, gateway }, evt("e7", "charge.refunded", { customer: "cus_1", refunded: false }));
    expect(gateway.cancelSubscriptionNow).not.toHaveBeenCalled();
    expect(states.get("u1")?.tier).toBe("pro");
  });

  it("a cancel that fails is not recorded, so Stripe retries the event", async () => {
    const { store, events } = fakeStore([pro]);
    const gateway = liveGateway("active");
    gateway.cancelSubscriptionNow.mockRejectedValue(new Error("stripe down"));
    await expect(
      handleStripeEvent({ store, gateway }, evt("e8", "charge.refunded", { customer: "cus_1", refunded: true })),
    ).rejects.toThrow();
    expect(events.has("e8")).toBe(false);
  });
});
