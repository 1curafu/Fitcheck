import { beforeEach, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { messagesFor } from "@/lib/i18n/messages";
import { validInput } from "@/lib/support/__tests__/fixtures";
const mocks = vi.hoisted(() => ({ runtime: vi.fn(), verify: vi.fn(), send: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/support/config", () => ({ readSupportRuntime: mocks.runtime }));
vi.mock("@/lib/support/turnstile", () => ({ verifySupportChallenge: mocks.verify }));
vi.mock("@/lib/support/send", () => ({ sendSupportEmail: mocks.send }));
vi.mock("@/lib/support/telemetry", () => ({ reportSupportFailure: mocks.report }));
import { sendSupportMessage } from "../actions";
beforeEach(() => {
  vi.resetAllMocks(); mocks.runtime.mockReturnValue({ mode: "stub", siteKey: "fitcheck-support-test", hostname: "fitcheck.space" });
  mocks.verify.mockResolvedValue({ status: "verified" }); mocks.send.mockResolvedValue({ status: "accepted", emailId: "provider-id" });
});
it("keeps login support public and sends only after verification", async () => {
  const order: string[] = [];
  mocks.verify.mockImplementation(async () => { order.push("verify"); return { status: "verified" }; });
  mocks.send.mockImplementation(async () => { order.push("send"); return { status: "accepted", emailId: "provider-id" }; });
  expect(await sendSupportMessage(validInput)).toEqual({ status: "sent", message: "Message sent. We'll reply by email." });
  expect(order).toEqual(["verify", "send"]);
  expect(mocks.send.mock.calls[0][0]).toMatchObject({ to: ["support@fitcheck.space"], reply_to: "reader@example.com" });
});
it("returns fallback before schema/providers when disabled", async () => {
  mocks.runtime.mockReturnValue({ mode: "off" });
  expect((await sendSupportMessage(validInput)).status).toBe("unavailable");
  expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it.each([
  { ...validInput, to: "victim@example.com" }, { ...validInput, submissionId: "bad" }, { ...validInput, challengeToken: "" },
])("rejects malformed public requests before any provider %#", async input => {
  expect((await sendSupportMessage(input)).status).toBe("invalid");
  expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
});
it.each(["replyEmail", "message", "topic"] as const)("returns narrow safe errors for %s", async field => {
  const result = await sendSupportMessage({ ...validInput, [field]: "bad" });
  expect(result.status).toBe("invalid");
  if (result.status !== "invalid") throw new Error("expected invalid");
  expect(Object.keys(result.fieldErrors)).toEqual([field]);
  expect(result.fieldErrors[field]).not.toContain("bad");
});
it.each([{ status: "rejected" }, { status: "failed", reason: "http", httpClass: "5xx" }])("does not send when verification fails", async result => {
  mocks.verify.mockResolvedValue(result);
  expect((await sendSupportMessage(validInput)).status).toBe("verification-failed");
  expect(mocks.send).not.toHaveBeenCalled();
});
it.each(["timeout", "http", "malformed", "network"])("never claims sent after provider %s", async reason => {
  mocks.send.mockResolvedValue({ status: "failed", reason });
  expect((await sendSupportMessage(validInput)).status).toBe("failed");
  expect(mocks.report).toHaveBeenCalledWith({ stage: "send", outcome: reason });
});
it("keeps provider identity and envelope stable across fresh-token retries", async () => {
  await sendSupportMessage(validInput); await sendSupportMessage({ ...validInput, challengeToken: "new-token" });
  expect(mocks.verify.mock.calls.map(call => call[0])).toEqual(["fresh-challenge", "new-token"]);
  expect(mocks.send.mock.calls[1]).toEqual(mocks.send.mock.calls[0]);
});
it("catches private failures even when diagnostics throw", async () => {
  mocks.send.mockRejectedValue(new Error("reader@example.com private message fresh-challenge"));
  mocks.report.mockImplementation(() => { throw new Error("diagnostic failure"); });
  const result = await sendSupportMessage(validInput);
  expect(result.status).toBe("failed"); expect(JSON.stringify(result)).not.toMatch(/reader@example.com|private message|fresh-challenge/);
  expect(mocks.report).toHaveBeenCalledWith({ stage: "send", outcome: "unexpected" });
});
it.each(SHIPPED_LOCALES)("returns real %s catalogue outcomes", async locale => {
  const messages = await messagesFor(locale);
  (globalThis as { __intl?: unknown }).__intl = { locale, messages };
  mocks.send.mockResolvedValue({ status: "failed", reason: "timeout" });
  const t = createTranslator({ locale, messages, namespace: "support" });
  expect((await sendSupportMessage(validInput)).message).toBe(t("results.failed"));
  expect(t("title")).not.toBe("support.title");
});
