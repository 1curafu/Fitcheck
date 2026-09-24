import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
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
