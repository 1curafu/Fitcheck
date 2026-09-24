import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
import { createBillingStore } from "../admin";
import { FREE_STATE } from "../stripe/status";

/** Records every chained call so a test can assert the exact query shape. */
function fakeClient(result: { data?: unknown; error?: unknown }, email: string | null = "a@b.c") {
  const calls: Array<[string, unknown[]]> = [];
  const chain: Record<string, unknown> = {
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: email ? { email } : null } })) } },
  };
  for (const m of ["from", "select", "update", "insert", "eq", "is", "maybeSingle", "single", "upsert"]) {
    chain[m] = (...args: unknown[]) => {
      calls.push([m, args]);
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null, ...result });
  return { client: chain, calls };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-test-key");
});

it("fails closed without service-role configuration", () => {
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", " ");
  expect(() => createBillingStore()).toThrow(/^Billing configuration is required$/);
  expect(createClient).not.toHaveBeenCalled();
});

it("writes billing state to exactly the billing columns and tier", async () => {
  const { client, calls } = fakeClient({});
  createClient.mockReturnValue(client);
  await createBillingStore().writeBillingState("u1", FREE_STATE);
  expect(calls).toContainEqual(["from", ["profiles"]]);
  expect(calls).toContainEqual([
    "update",
    [{
      stripe_subscription_id: null, subscription_status: null, subscription_interval: null,
      current_period_end: null, cancel_at_period_end: false, tier: "free",
    }],
  ]);
  expect(calls).toContainEqual(["eq", ["id", "u1"]]);
});

it("claims a customer id only where none is stored", async () => {
  const { client, calls } = fakeClient({ data: { stripe_customer_id: "cus_A" } });
  createClient.mockReturnValue(client);
  await expect(createBillingStore().claimCustomerId("u1", "cus_A")).resolves.toBe("cus_A");
  expect(calls).toContainEqual(["is", ["stripe_customer_id", null]]);
});

it("returns the winner's id when another request claimed first", async () => {
  const { client } = fakeClient({ data: { stripe_customer_id: "cus_WINNER" } });
  createClient.mockReturnValue(client);
  await expect(createBillingStore().claimCustomerId("u1", "cus_LOSER")).resolves.toBe("cus_WINNER");
});

it("reads a billing profile with the Auth email, failing closed on an unknown tier", async () => {
  const { client } = fakeClient({ data: { id: "u1", stripe_customer_id: null, tier: "platinum" } });
  createClient.mockReturnValue(client);
  await expect(createBillingStore().profileByUserId("u1")).resolves.toEqual({
    userId: "u1", email: "a@b.c", stripeCustomerId: null, tier: "free",
  });
});

it("surfaces write errors with a sanitized message", async () => {
  const { client } = fakeClient({ error: { message: "private detail" } });
  createClient.mockReturnValue(client);
  await expect(createBillingStore().writeBillingState("u1", FREE_STATE)).rejects.toThrow(/^Billing state write failed$/);
});
