import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { seedTestUser, TEST_USER } from "./seed";

const STORAGE_STATE = "e2e/.auth/state.json";

/**
 * Sign in once, save the session, and let every other spec start signed in.
 *
 * ⚠️ **The cookie format is produced by `@supabase/ssr` itself, never
 * hand-written.** The session lives in a chunked, base64-encoded cookie whose
 * name is derived from the project URL; reverse-engineering that would work
 * until the library changed it and then fail in a way that looks like an auth
 * bug. Here the library serialises the session into a jar we control, and the
 * exact cookies it emits are handed to Playwright.
 *
 * ⚠️ **Not the magic link.** `/auth/callback` is PKCE and needs a verifier the
 * browser stores when it *initiates* sign-in; a link minted by the admin API
 * has no verifier, so that path cannot be driven from outside the browser.
 * Driving Mailpit's UI instead would be slow and flaky.
 */
setup("authenticate and seed", async ({ browser }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  expect(url && anon && service, "Supabase env must be sourced before e2e").toBeTruthy();

  await seedTestUser({ url, service });

  // A real sign-in, so the session is one Supabase actually issued.
  const { data, error } = await createClient(url, anon).auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  expect(error, `sign-in failed: ${error?.message}`).toBeNull();
  const session = data.session!;

  // Let @supabase/ssr write the cookies, and record exactly what it wrote.
  const written: { name: string; value: string }[] = [];
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [],
      // Must return void, not the push()'s number — the overload is strict.
      setAll: (all) => {
        written.push(...all);
      },
    },
  });
  await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  expect(written.length, "@supabase/ssr wrote no cookies").toBeGreaterThan(0);

  const context = await browser.newContext();
  await context.addCookies(
    written.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })),
  );
  await context.storageState({ path: STORAGE_STATE });
  await context.close();
});
