import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests, against a production build and the local Supabase stack.
 *
 * ⚠️ **One project, and it is a phone.** Fitcheck is a mobile-only PWA, and a
 * desktop-width viewport has already produced a false finding on this project
 * once — the occasion row measured as "34% visible" on a 440px shell when the
 * real number on every phone was 0% (`docs/STATE.md`). A desktop project here
 * would be testing a layout no user ever sees.
 *
 * ⚠️ **`next start`, not `next dev`.** Dev disables prefetching entirely, so
 * anything this suite asserts about navigation speed would be measured against
 * a build that behaves differently from production. It also means a broken
 * build fails the suite, which is the honest outcome.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // one seeded user, one database — parallel runs would fight
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky e2e suite gets ignored; make it deterministic instead
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      // ⚠️ The same device as the real project, so this needs the SAME browser.
      // Without it the setup project defaults to Chromium, which CI does not
      // install — and it passed locally only because Chromium happened to be
      // there from an earlier manual install. One browser, everywhere.
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "iphone",
      use: { ...devices["iPhone 15"] },
      dependencies: ["setup"],
      // Written by the setup project: a signed-in session, so no test has to
      // walk a magic link.
      testIgnore: /global\.setup\.ts/,
    },
  ],

  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // The generator's model call is stubbed: deterministic, free, and it
      // still runs the whole pipeline in front of it. See `stubbedRerank`.
      FITCHECK_STUB_AI: "1",
    },
  },
});
