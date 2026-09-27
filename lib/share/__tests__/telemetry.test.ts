import { beforeEach, expect, test, vi } from "vitest";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureRouterTransitionStart: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

const token = "AAAAAAAAAAAAAAAAAAAAAA";
const page = `https://fitcheck.space/l/${token}`;
const image = `https://example.supabase.co/storage/v1/object/public/shares/${token}/post.jpg`;

beforeEach(() => { sentry.init.mockClear(); vi.resetModules(); });

test.each([
  ["browser", () => import("../../../instrumentation-client")],
  ["server", () => import("../../../sentry.server.config")],
  ["edge", () => import("../../../sentry.edge.config")],
] as const)("%s Sentry payloads omit public share capabilities in every URL-bearing field", async (_, load) => {
  await load();
  const options = sentry.init.mock.lastCall?.[0];
  expect(options).toBeDefined();
  const event = {
    request: { url: page, headers: { referer: page } },
    breadcrumbs: [{ category: "fetch", message: page, data: { url: image } }],
    exception: { values: [{ value: `Failed at ${page}` }] },
    spans: [{ data: { "url.full": image } }],
  };
  expect(JSON.stringify(options.beforeSend(structuredClone(event)))).not.toContain(token);
  expect(JSON.stringify(options.beforeSendTransaction({ ...structuredClone(event), transaction: page }))).not.toContain(token);
  expect(JSON.stringify(options.beforeSendSpan({ data: { "url.full": image } }))).not.toContain(token);
  expect(JSON.stringify(options.beforeSendLog({ body: page, attributes: { image } }))).not.toContain(token);
  expect(JSON.stringify(options.beforeSendMetric({ name: "share", attributes: { page } }))).not.toContain(token);
  expect(JSON.stringify(options.beforeBreadcrumb({ message: page, data: { url: image } }))).not.toContain(token);
});
