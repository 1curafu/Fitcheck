import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { verifySupportChallenge } from "../turnstile";
import type { EnabledSupportRuntime } from "../config";

const runtime: EnabledSupportRuntime = { mode: "live", hostname: "fitcheck.space", siteKey: "public-key", turnstileSecret: "secret", resendKey: "sending" };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it.each([
  { success: false, action: "support", hostname: "fitcheck.space" },
  { success: true, action: "login", hostname: "fitcheck.space" },
  { success: true, action: "support", hostname: "localhost" },
  { success: true, action: "support", hostname: "evil.example" },
  { success: "true", action: "support", hostname: "fitcheck.space" }, { success: true }, null, [],
])("rejects out-of-authority challenge results %#", async body => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  expect(await verifySupportChallenge("token", runtime)).toEqual({ status: "rejected" });
});
it("posts secret and token only, without a visitor IP", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, action: "support", hostname: "fitcheck.space" }));
  vi.stubGlobal("fetch", fetcher);
  expect(await verifySupportChallenge("token", runtime)).toEqual({ status: "verified" });
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
  expect(options).toMatchObject({ method: "POST", cache: "no-store" });
  expect(JSON.parse(options.body)).toEqual({ secret: "secret", response: "token" });
});
it.each(["", " ", "x".repeat(2049), "fitcheck-support-test:123e4567-e89b-42d3-a456-426614174000"])("rejects unusable live tokens before I/O", async token => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await verifySupportChallenge(token, runtime)).toEqual({ status: "rejected" });
  expect(fetcher).not.toHaveBeenCalled();
});
it("runs the normal response guards without network in stub mode", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const stub = { mode: "stub", siteKey: "fitcheck-support-test", hostname: "fitcheck.space" } as const;
  expect(await verifySupportChallenge("fitcheck-support-test:123e4567-e89b-42d3-a456-426614174000", stub)).toEqual({ status: "verified" });
  expect(await verifySupportChallenge("fitcheck-support-test:forged", stub)).toEqual({ status: "rejected" });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each(["fetch", "parse"])("aborts at five seconds during %s", async stage => {
  vi.useFakeTimers(); let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((_url, options) => {
    signal = options.signal;
    return stage === "fetch" ? new Promise(() => {}) : Promise.resolve({ ok: true, json: () => new Promise(() => {}) });
  }));
  const pending = verifySupportChallenge("token", runtime);
  await vi.advanceTimersByTimeAsync(5000);
  expect(await pending).toEqual({ status: "failed", reason: "timeout" });
  expect(signal?.aborted).toBe(true);
});
it.each([
  [new Response("private", { status: 503 }), "http"], [new Response("not JSON"), "malformed"],
])("sanitizes provider failures", async (response, reason) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  expect(await verifySupportChallenge("token", runtime)).toMatchObject({ status: "failed", reason });
});
it("never returns private thrown network details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private token secret")));
  expect(await verifySupportChallenge("token", runtime)).toEqual({ status: "failed", reason: "network" });
});
