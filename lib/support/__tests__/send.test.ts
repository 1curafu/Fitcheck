import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendSupportEmail } from "../send";
import { buildSupportEmail } from "../email";
import { validInput } from "./fixtures";
import type { EnabledSupportRuntime } from "../config";
const runtime: EnabledSupportRuntime = { mode: "live", hostname: "fitcheck.space", siteKey: "public", turnstileSecret: "challenge", resendKey: "sending-secret" };
const email = buildSupportEmail(validInput);
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it.each([429, 500, 503])("never claims acceptance or retries HTTP %i", async status => {
  const fetcher = vi.fn().mockResolvedValue(new Response("private provider body", { status })); vi.stubGlobal("fetch", fetcher);
  const result = await sendSupportEmail(email, validInput.submissionId, runtime);
  expect(result).toMatchObject({ status: "failed", reason: "http", httpClass: status === 429 ? "4xx" : "5xx" });
  expect(JSON.stringify(result)).not.toContain("private"); expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([{}, { id: "" }, { id: " " }, { id: 1 }, { id: "x".repeat(257) }, null])("requires bounded nonempty provider acceptance %#", async body => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  expect(await sendSupportEmail(email, validInput.submissionId, runtime)).toEqual({ status: "failed", reason: "malformed" });
});
it("sends stable payloads and idempotency keys on unchanged retries", async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ id: "provider-id" }))); vi.stubGlobal("fetch", fetcher);
  expect(await sendSupportEmail(email, validInput.submissionId, runtime)).toEqual({ status: "accepted", emailId: "provider-id" });
  await sendSupportEmail(buildSupportEmail({ ...validInput, challengeToken: "new" }), validInput.submissionId, runtime);
  expect(fetcher.mock.calls[0][0]).toBe("https://api.resend.com/emails");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", cache: "no-store", headers: { Authorization: "Bearer sending-secret", "Content-Type": "application/json", "Idempotency-Key": "support/v1/123e4567-e89b-42d3-a456-426614174000" } });
  expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  await sendSupportEmail(email, "another-id", runtime);
  expect(fetcher.mock.calls[2][1].headers["Idempotency-Key"]).toBe("support/v1/another-id");
});
it.each(["fetch", "parse"])("aborts at eight seconds during %s", async stage => {
  vi.useFakeTimers(); let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((_url, options) => { signal = options.signal; return stage === "fetch" ? new Promise(() => {}) : Promise.resolve({ ok: true, json: () => new Promise(() => {}) }); }));
  const pending = sendSupportEmail(email, validInput.submissionId, runtime); await vi.advanceTimersByTimeAsync(8000);
  expect(await pending).toEqual({ status: "failed", reason: "timeout" }); expect(signal?.aborted).toBe(true);
});
it("uses the normal acceptance parser with no network in the local stub", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await sendSupportEmail(email, validInput.submissionId, { mode: "stub", siteKey: "fitcheck-support-test", hostname: "fitcheck.space" })).toEqual({ status: "accepted", emailId: `stub-support-${validInput.submissionId}` });
  expect(fetcher).not.toHaveBeenCalled();
});
it("reports invalid JSON and thrown exceptions without leaking them", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private invalid JSON")));
  expect(await sendSupportEmail(email, validInput.submissionId, runtime)).toEqual({ status: "failed", reason: "malformed" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sending-secret")));
  expect(await sendSupportEmail(email, validInput.submissionId, runtime)).toEqual({ status: "failed", reason: "network" });
});

it("aborts a rejected transport without reading its private response body", async () => {
  let signal: AbortSignal | undefined;
  const response = new Response("private provider body", { status: 429 });
  const parse = vi.spyOn(response, "json");
  vi.stubGlobal("fetch", vi.fn((_url, options) => { signal = options.signal; return Promise.resolve(response); }));
  expect(await sendSupportEmail(email, validInput.submissionId, runtime)).toEqual({ status: "failed", reason: "http", httpClass: "4xx" });
  expect(parse).not.toHaveBeenCalled();
  expect(signal?.aborted).toBe(true);
});
