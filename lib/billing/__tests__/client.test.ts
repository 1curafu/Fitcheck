import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const StripeCtor = vi.hoisted(() => vi.fn());
vi.mock("stripe", async (orig) => {
  const real = (await orig<typeof import("stripe")>()).default;
  const Fake = function (this: unknown, key: string, config: unknown) {
    StripeCtor(key, config);
    return new real(key, config as never);
  } as unknown as typeof real;
  Object.assign(Fake, { webhooks: real.webhooks });
  return { default: Fake };
});
import { billingEnabled, getGateway } from "../stripe/client";

afterEach(() => vi.unstubAllEnvs());

it("is off without both secrets", () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  expect(billingEnabled()).toBe(false);
  expect(() => getGateway()).toThrow(/^Billing is not configured$/);
});

it("is on with both secrets", () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  expect(billingEnabled()).toBe(true);
});

it("the e2e stub is refused in production", () => {
  vi.stubEnv("FITCHECK_STUB_STRIPE", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  expect(billingEnabled()).toBe(false);
  expect(() => getGateway()).toThrow(/^Billing is not configured$/);
});

it("the e2e stub is used outside production", () => {
  vi.stubEnv("FITCHECK_STUB_STRIPE", "1");
  vi.stubEnv("VERCEL_ENV", "");
  expect(billingEnabled()).toBe(true);
  expect(getGateway()).toBeDefined();
});

// Review C2: Vercel Preview shares the PRODUCTION Supabase (docs/STATE.md). Sandbox keys there would write test-mode
// customers and test-card Pro onto real profiles, so billing refuses Preview outright until a staging database exists.
it("is off on Vercel Preview even with keys, because Preview shares the production database", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_x");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  expect(billingEnabled()).toBe(false);
  expect(() => getGateway()).toThrow(/^Billing is not configured$/);
});

it("the e2e stub only runs outside Vercel (local and CI), never on Preview (review M1)", () => {
  vi.stubEnv("FITCHECK_STUB_STRIPE", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("STRIPE_SECRET_KEY", "");
  expect(billingEnabled()).toBe(false);
});


it("Stripe calls time out well inside a serverless function's limit (review M6)", () => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("FITCHECK_STUB_STRIPE", "");
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_timeout");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  getGateway();
  expect(StripeCtor).toHaveBeenCalledWith("rk_test_timeout", expect.objectContaining({ timeout: 10_000, maxNetworkRetries: 1 }));
});
