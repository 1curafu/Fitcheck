import { beforeEach, expect, it, vi } from "vitest";
import type { Scope } from "@sentry/nextjs";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), client: {}, scope: null as Scope | null, isolation: null as Scope | null }));
vi.mock("@sentry/nextjs", async importOriginal => {
  const actual = await importOriginal<typeof import("@sentry/nextjs")>();
  const core = await import("@sentry/core");
  return {
    ...actual, Scope: core.Scope, getCurrentScope: core.getCurrentScope,
    getIsolationScope: core.getIsolationScope, captureRouterTransitionStart: vi.fn(), init: mocks.init, captureMessage: mocks.capture,
    getClient: vi.fn(() => mocks.client),
    withIsolationScope: (scope: Scope, callback: () => void) => { mocks.isolation = scope; return callback(); },
    withScope: (scope: Scope, callback: () => void) => { mocks.scope = scope; return callback(); },
  };
});
import * as Sentry from "@sentry/nextjs";
import { reportSupportFailure } from "../telemetry";
beforeEach(() => { vi.clearAllMocks(); mocks.scope = null; mocks.isolation = null; vi.mocked(Sentry.getClient).mockReturnValue(mocks.client as ReturnType<typeof Sentry.getClient>); });

it.each(["server", "edge", "client"])("disables content collection in %s and preserves share redaction", async runtime => {
  vi.resetModules();
  if (runtime === "server") await import("../../../sentry.server.config");
  if (runtime === "edge") await import("../../../sentry.edge.config");
  if (runtime === "client") await import("../../../instrumentation-client");
  const options = mocks.init.mock.calls[0][0];
  expect(options.dataCollection).toEqual({ userInfo: false, httpBodies: [], stackFrameVariables: false });
  const event = options.beforeSend({ request: { url: "/l/AAAAAAAAAAAAAAAAAAAAAA" } });
  expect(JSON.stringify(event)).not.toContain("AAAAAAAAAAAAAAAAAAAAAA");
});

it("reports fixed tags in fresh scopes, never arbitrary context", () => {
  const parent = Sentry.getCurrentScope();
  parent.setUser({ email: "reader@example.com" });
  parent.setExtra("privateMessage", "private message");
  parent.setSDKProcessingMetadata({ privateToken: "private token" });
  const input = { stage: "send", outcome: "http", httpClass: "4xx", privateMessage: "private message" } as const;
  reportSupportFailure(input);
  expect(mocks.capture).toHaveBeenCalledWith("Support submission failed", { level: "warning", tags: { feature: "support", stage: "send", outcome: "http", httpClass: "4xx" } });
  expect(mocks.scope).not.toBe(parent);
  expect(mocks.isolation).not.toBe(Sentry.getIsolationScope());
  expect(JSON.stringify(mocks.scope?.getScopeData())).not.toMatch(/private message|private token|reader@example.com/);
  expect(JSON.stringify(mocks.isolation?.getScopeData())).not.toMatch(/private message|private token|reader@example.com/);
  expect(parent.getScopeData().extra.privateMessage).toBe("private message");
});
it("does nothing without a configured client", () => {
  vi.mocked(Sentry.getClient).mockReturnValue(undefined);
  reportSupportFailure({ stage: "verify", outcome: "rejected" });
  expect(mocks.capture).not.toHaveBeenCalled();
});
it("cannot turn a telemetry failure into an action failure", () => {
  mocks.capture.mockImplementationOnce(() => { throw new Error("diagnostic failure"); });
  expect(() => reportSupportFailure({ stage: "action", outcome: "unexpected" })).not.toThrow();
});
