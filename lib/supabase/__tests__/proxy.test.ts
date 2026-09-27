import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const ssr = vi.hoisted(() => ({ toSet: [] as { name: string; value: string; options: object }[] }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_u: string, _k: string, o: { cookies: { setAll: (c: typeof ssr.toSet) => void } }) => ({
    auth: { getUser: async () => { o.cookies.setAll(ssr.toSet); return { data: { user: null } }; } },
  }),
}));

import { config, proxy } from "@/proxy";

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "https://fitcheck.space"), { headers });

beforeEach(() => { ssr.toSet = []; });

it("leaves the image model and ONNX runtime files outside locale routing", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);
  expect(matcher.test("/ort/ort-wasm-simd-threaded.mjs")).toBe(false);
  expect(matcher.test("/ort/ort-wasm-simd-threaded.wasm")).toBe(false);
  expect(matcher.test("/models/u2netp.onnx")).toBe(false);
  expect(matcher.test("/closet/upload")).toBe(true);
});

it("refreshed cookies reach the rewritten request and the browser", async () => {
  ssr.toSet = [{ name: "sb-access-token", value: "fresh", options: { path: "/" } }];
  const res = await proxy(req("/uk/closet", { cookie: "sb-access-token=stale" }));
  expect(res.cookies.get("sb-access-token")?.value).toBe("fresh");
  // Server Components read the request cookie header next-intl forwards on its rewrite/next response.
  expect(res.headers.get("x-middleware-request-cookie") ?? "").toContain("sb-access-token=fresh");
});

it("an en-US visitor on a bare path is not redirected", async () => {
  const res = await proxy(req("/closet", { "accept-language": "en-US,en;q=0.9" }));
  expect(res.headers.get("location")).toBeNull();
});

it("a saved Ukrainian choice redirects a bare path to /uk", async () => {
  const res = await proxy(req("/closet", { cookie: "NEXT_LOCALE=uk" }));
  expect(new URL(res.headers.get("location")!).pathname).toBe("/uk/closet");
});

it("a Ukrainian browser is sent to /uk on first visit", async () => {
  const res = await proxy(req("/", { "accept-language": "uk-UA,uk;q=0.9,en;q=0.5" }));
  expect(new URL(res.headers.get("location")!).pathname).toBe("/uk");
});

it.each(["/auth/callback?code=x", "/billing/return?session_id=x", "/api/cities?q=a"])(
  "%s is locale-free: never redirected, session still refreshed", async (path) => {
    ssr.toSet = [{ name: "sb-access-token", value: "fresh", options: { path: "/" } }];
    const res = await proxy(req(path, { cookie: "NEXT_LOCALE=uk" }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get("sb-access-token")?.value).toBe("fresh");
  });
