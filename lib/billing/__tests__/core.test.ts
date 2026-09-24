import { describe, expect, it, vi } from "vitest";
const sentry = vi.hoisted(() => ({ captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);
import { fakeGateway, fakeStore, sub } from "./fakes";
import { ensureCustomer } from "../stripe/customer";
import { syncCustomer } from "../stripe/sync";
import { cancelAllSubscriptions } from "../stripe/cancel";

const alice = { userId: "u1", email: "new@example.com", stripeCustomerId: null, tier: "free" as const };

describe("ensureCustomer", () => {
  it("creates once and stores the id", async () => {
    const { store, rows } = fakeStore([alice]);
    const gateway = fakeGateway();
    await expect(ensureCustomer({ store, gateway }, alice)).resolves.toBe("cus_new");
    expect(rows.get("u1")!.stripeCustomerId).toBe("cus_new");
    expect(gateway.createCustomer).toHaveBeenCalledWith({ email: "new@example.com", userId: "u1" });
  });

  it("reuses an existing customer and syncs a changed email", async () => {
    const existing = { ...alice, stripeCustomerId: "cus_1" };
    const gateway = fakeGateway();
    await expect(ensureCustomer({ store: fakeStore([existing]).store, gateway }, existing)).resolves.toBe("cus_1");
    expect(gateway.createCustomer).not.toHaveBeenCalled();
    expect(gateway.updateCustomerEmail).toHaveBeenCalledWith("cus_1", "new@example.com");
  });

  it("does not call Stripe to update an unchanged email", async () => {
    const existing = { ...alice, stripeCustomerId: "cus_1" };
    const gateway = fakeGateway();
    gateway.customerEmail.mockResolvedValue("new@example.com");
    await ensureCustomer({ store: fakeStore([existing]).store, gateway }, existing);
    expect(gateway.updateCustomerEmail).not.toHaveBeenCalled();
  });

  it("a concurrent request that lost the claim uses the winner's customer", async () => {
    const { store, rows } = fakeStore([alice]);
    const claim = store.claimCustomerId;
    store.claimCustomerId = async (id, c) => {
      rows.get(id)!.stripeCustomerId = "cus_winner"; // another tab stored its customer first
      return claim(id, c);
    };
    await expect(ensureCustomer({ store, gateway: fakeGateway() }, alice)).resolves.toBe("cus_winner");
  });
});

describe("syncCustomer", () => {
  it("writes Pro for an active subscription", async () => {
    const { store, states } = fakeStore([{ ...alice, stripeCustomerId: "cus_1" }]);
    const res = await syncCustomer({ store, gateway: fakeGateway({ cus_1: [sub("s1", "active")] }) }, "cus_1");
    expect(res.userId).toBe("u1");
    expect(states.get("u1")?.tier).toBe("pro");
  });

  it("past_due keeps Pro (grace while Stripe retries)", async () => {
    const { store, states } = fakeStore([{ ...alice, stripeCustomerId: "cus_1" }]);
    await syncCustomer({ store, gateway: fakeGateway({ cus_1: [sub("s1", "past_due")] }) }, "cus_1");
    expect(states.get("u1")?.tier).toBe("pro");
  });

  it("canceled drops to free", async () => {
    const { store, states } = fakeStore([{ ...alice, stripeCustomerId: "cus_1", tier: "pro" }]);
    await syncCustomer({ store, gateway: fakeGateway({ cus_1: [sub("s1", "canceled")] }) }, "cus_1");
    expect(states.get("u1")?.tier).toBe("free");
  });

  it("an unknown Stripe status fails closed to free AND is reported (review I3)", async () => {
    const { store, states } = fakeStore([{ ...alice, stripeCustomerId: "cus_1", tier: "pro" }]);
    await syncCustomer({ store, gateway: fakeGateway({ cus_1: [sub("s1", "suspended_new_state")] }) }, "cus_1");
    expect(states.get("u1")?.tier).toBe("free");
    expect(sentry.captureMessage).toHaveBeenCalledWith("Unknown Stripe subscription status", {
      level: "warning",
      tags: { stripe_subscription_status: "suspended_new_state" },
    });
  });

  it("a known status is not reported", async () => {
    sentry.captureMessage.mockClear();
    const { store } = fakeStore([{ ...alice, stripeCustomerId: "cus_1" }]);
    await syncCustomer({ store, gateway: fakeGateway({ cus_1: [sub("s1", "canceled")] }) }, "cus_1");
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("an unknown customer (deleted account) is a no-op", async () => {
    const { store, states } = fakeStore([]);
    await expect(syncCustomer({ store, gateway: fakeGateway() }, "cus_gone")).resolves.toEqual({ userId: null, state: null });
    expect(states.size).toBe(0);
  });

  it("reads current state from Stripe, so a stale trigger cannot regress the tier", async () => {
    const { store, states } = fakeStore([{ ...alice, stripeCustomerId: "cus_1" }]);
    const gateway = fakeGateway({ cus_1: [sub("s_old", "canceled", 100), sub("s_new", "active", 900)] });
    await syncCustomer({ store, gateway }, "cus_1");
    expect(states.get("u1")).toMatchObject({ subscriptionId: "s_new", tier: "pro" });
  });
});

describe("cancelAllSubscriptions", () => {
  it("no customer is a no-op", async () => {
    const gateway = fakeGateway();
    await cancelAllSubscriptions({ store: fakeStore().store, gateway }, null);
    expect(gateway.listSubscriptions).not.toHaveBeenCalled();
  });

  it("cancels every subscription that can still charge, then verifies", async () => {
    const gateway = fakeGateway();
    gateway.listSubscriptions
      .mockResolvedValueOnce([sub("a", "active"), sub("b", "past_due"), sub("c", "canceled")])
      .mockResolvedValueOnce([sub("a", "canceled"), sub("b", "canceled"), sub("c", "canceled")]);
    await cancelAllSubscriptions({ store: fakeStore().store, gateway }, "cus_1");
    expect(gateway.cancelSubscriptionNow.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
  });

  it("also cancels a paused subscription, which could resume and charge later (review M8)", async () => {
    const gateway = fakeGateway();
    gateway.listSubscriptions
      .mockResolvedValueOnce([sub("p", "paused")])
      .mockResolvedValueOnce([sub("p", "canceled")]);
    await cancelAllSubscriptions({ store: fakeStore().store, gateway }, "cus_1");
    expect(gateway.cancelSubscriptionNow).toHaveBeenCalledWith("p");
  });

  it("fails closed if anything can still charge afterwards", async () => {
    const gateway = fakeGateway();
    gateway.listSubscriptions.mockResolvedValue([sub("a", "active")]);
    await expect(cancelAllSubscriptions({ store: fakeStore().store, gateway }, "cus_1")).rejects.toThrow(
      /^Billing cancellation failed$/,
    );
  });
});
