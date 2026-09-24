import { expect, it } from "vitest";
import { fakeGateway, fakeStore, sub } from "./fakes";
import { customerIdOf, handleStripeEvent } from "../stripe/webhook";

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
    handleStripeEvent({ store: fakeStore([bob]).store, gateway }, evt("e3", "charge.refunded", {})),
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
