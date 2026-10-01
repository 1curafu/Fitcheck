import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getSupportPageConfig, readSupportRuntime } from "../config";

const liveEnv = { NODE_ENV: "test" as const, SUPPORT_ENABLED: "1", RESEND_API_KEY: "sending-secret", TURNSTILE_SECRET_KEY: "challenge-secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "public-key", VERCEL: "1", VERCEL_ENV: "production" };
it("passes only public form configuration to the browser", () => {
  expect(getSupportPageConfig(readSupportRuntime(liveEnv))).toEqual({ enabled: true, siteKey: "public-key" });
});
it.each(["SUPPORT_ENABLED", "RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"])("fails closed without %s", name => {
  expect(readSupportRuntime({ ...liveEnv, [name]: " " })).toEqual({ mode: "off" });
});
it.each([
  { ...liveEnv, FITCHECK_STUB_SUPPORT: "1" },
  { ...liveEnv, VERCEL_ENV: "preview" }, { ...liveEnv, VERCEL_ENV: "development" },
  { ...liveEnv, VERCEL_ENV: "unknown" }, { ...liveEnv, VERCEL_ENV: undefined },
  { ...liveEnv, VERCEL: undefined, VERCEL_ENV: "preview", FITCHECK_STUB_SUPPORT: "1" },
])("never permits a deployed bypass or preview delivery %#", env => {
  expect(readSupportRuntime(env)).toEqual({ mode: "off" });
});
it("permits only the local stub without credentials", () => {
  const runtime = readSupportRuntime({ NODE_ENV: "test", FITCHECK_STUB_SUPPORT: "1" });
  expect(runtime).toEqual({ mode: "stub", siteKey: "fitcheck-support-test", hostname: "fitcheck.space" });
  expect(getSupportPageConfig(runtime)).toEqual({ enabled: true, siteKey: "fitcheck-support-test" });
  expect(getSupportPageConfig({ mode: "off" })).toEqual({ enabled: false, siteKey: null });
});
it("trims credential configuration and requires exact activation", () => {
  expect(readSupportRuntime({ ...liveEnv, SUPPORT_ENABLED: "true" })).toEqual({ mode: "off" });
  expect(readSupportRuntime({ ...liveEnv, RESEND_API_KEY: " sending-secret " })).toMatchObject({ mode: "live", resendKey: "sending-secret" });
});
