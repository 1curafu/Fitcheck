import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { admin, testUserId } from "./helpers";

/**
 * ⚠️ THE security test for Cache Components. Written BEFORE the conversion,
 * because it is the regression that must never ship.
 *
 * Under Cache Components, Next prerenders a SHELL for each route and prefetches
 * it. A shell is cached on the ROUTE key, not on a user key. So anything
 * user-specific that leaks into it is served to the next visitor of that route —
 * a different person's wardrobe, their closet value, their archetype.
 *
 * ⚠️ **RLS does not help here.** `auth.uid() = user_id` protects the database
 * READ. It says nothing about an already-rendered HTML fragment sitting in a
 * server-side cache. Reasoning "RLS covers it" is exactly the mistake this file
 * exists to catch.
 *
 * The test fetches each route with NO session at all. Whatever comes back is,
 * by definition, the part of the page that does not depend on who is asking —
 * and it must contain nothing that belongs to anybody.
 */

const ROUTES = ["/closet", "/generate", "/stats", "/profile", "/calendar", "/settings"];

/** Strings that exist ONLY because a specific user owns specific things. */
async function privateStrings(): Promise<string[]> {
  const db = admin();
  const userId = await testUserId();

  const { data: items } = await db.from("items").select("name").eq("user_id", userId);
  const { data: profile } = await db
    .from("profiles")
    .select("display_name, archetype, location_label")
    .eq("id", userId)
    .single();

  return [
    ...(items ?? []).map((i) => i.name as string),
    profile?.display_name,
    profile?.archetype,
    profile?.location_label,
  ].filter((s): s is string => typeof s === "string" && s.length > 2);
}

test("no route's unauthenticated response contains another user's data", async ({ playwright }) => {
  const secrets = await privateStrings();
  expect(secrets.length, "the seeded user must own something worth leaking").toBeGreaterThan(3);

  /**
   * A raw HTTP request with no cookies, NOT a browser navigation.
   *
   * Driving a page here fails for the wrong reason: the app correctly redirects
   * a signed-out visitor to `/`, and Playwright aborts the navigation as
   * interrupted. That is the auth guard working — but it tells us nothing about
   * what the SHELL contains, which is the actual question. `maxRedirects: 0`
   * keeps the body of the response the route itself produced.
   */
  const api = await playwright.request.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
  });

  for (const route of ROUTES) {
    const response = await api.get(route, { maxRedirects: 0 });
    const html = await response.text();

    for (const secret of secrets) {
      expect(
        html.includes(secret),
        `${route} leaked "${secret}" to an unauthenticated request`,
      ).toBe(false);
    }
  }

  await api.dispose();
});

/** Every file Next prerendered — the actual artefacts that get cached and served. */
function shellArtefacts(dir = ".next/server/app", out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) shellArtefacts(path, out);
    else if (/\.(html|rsc)$/.test(entry)) out.push(path);
  }
  return out;
}

test("no PRERENDERED shell contains user data", async () => {
  /**
   * The HTTP test above catches a route that forgot its auth guard. This one
   * catches the subtler thing: user data baked into a prerendered shell, which
   * is cached on the ROUTE key and served to whoever asks next.
   *
   * ⚠️ Next.js already prevents the main vector at BUILD time — `cookies()`
   * inside a `use cache` scope is a hard build error ("Accessing Dynamic data
   * sources inside a cache scope is not supported"), verified 2026-08-19 by
   * deliberately writing one. So the session cannot be read inside a cached
   * function at all, and the only way to cache per-user data is to pass the
   * user id as an ARGUMENT — which puts it in the cache key, correctly scoped.
   *
   * This guard is defence in depth against the case the compiler cannot see:
   * a literal, a fixture, or a build-time query that bakes somebody's data into
   * a shell. It reads the artefacts on disk rather than making a request,
   * because those files ARE what gets served.
   */
  const secrets = await privateStrings();
  const files = shellArtefacts();
  expect(files.length, "no prerendered artefacts — did the build run?").toBeGreaterThan(0);

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const secret of secrets) {
      expect(content.includes(secret), `${file} baked in "${secret}"`).toBe(false);
    }
  }
});

test("the seeded user still sees their own data when signed in", async ({ browser }) => {
  // The other half: a guard that passes because NOTHING renders would be
  // worthless. This proves the data is reachable when it should be.
  const context = await browser.newContext({ storageState: "e2e/.auth/state.json" });
  const page = await context.newPage();
  await page.goto("/closet");
  await expect(page.getByText("E2E Oxford Shirt").first()).toBeVisible();
  await context.close();
});
