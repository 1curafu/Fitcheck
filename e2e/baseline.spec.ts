import { test, type Locator, type Page } from "@playwright/test";
import { admin, installRealisticImages, logWearToday, reseed, testUserId } from "./helpers";

test.use({ storageState: "e2e/.auth/state.json" });

/**
 * Task 0 of the instant-navigations plan: numbers BEFORE any flag.
 *
 * Not an assertion — a measurement. It prints and never fails, so it can be
 * re-run after the flags land and the two sets compared.
 *
 * ⚠️ Each navigation gets a FRESH page. Reusing one across measurements meant a
 * `goto` racing the app's own in-flight client-side navigation, which
 * Playwright aborts — the measurement was fighting the thing it measured.
 */
const NAVS: { name: string; from: string; link: RegExp }[] = [
  { name: "nav → Closet", from: "/generate", link: /closet/i },
  { name: "nav → Diary", from: "/closet", link: /diary/i },
  { name: "nav → Profile", from: "/closet", link: /profile/i },
  { name: "nav → Stylist", from: "/closet", link: /stylist/i },
];

// Tagged @measure: a measurement, not a test. Excluded from the normal run
// (`--grep-invert @measure`) so CI does not spend 7s printing numbers nobody
// reads. Run deliberately: `npx playwright test --grep @measure`.
test("measure navigation @measure", async ({ browser }) => {
  console.log("\n  --- navigation, production build ---");

  for (const nav of NAVS) {
    const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });
    await page.goto(nav.from);
    await page.waitForLoadState("networkidle");

    const t0 = Date.now();
    await page.getByRole("link", { name: nav.link }).first().click();
    await page.waitForLoadState("networkidle");
    console.log(`  ${nav.name.padEnd(20)} ${Date.now() - t0}ms`);
    await page.close();
  }

  // The most-tapped path in the app.
  const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });
  await page.goto("/closet");
  await page.waitForLoadState("networkidle");
  const t = Date.now();
  await page.getByText("E2E Oxford Shirt").first().click();
  await page.waitForLoadState("networkidle");
  console.log(`  ${"grid → item".padEnd(20)} ${Date.now() - t}ms\n`);
  await page.close();
});

/**
 * Task 6 Step 1: what a user sees the moment they tap, versus when the screen
 * is finally complete.
 *
 * ⚠️ The two numbers answer different questions, and conflating them is why the
 * Task 0 timings were misleading. `waitForLoadState` measures the SECOND — a
 * converted route and an unconverted one finish at nearly the same time,
 * because the streamed body still has to arrive either way. Instant
 * Navigations changes the FIRST.
 */
test("measure shell vs complete @measure", async ({ browser }) => {
  console.log("\n  --- shell (first paint of chrome) vs complete ---");

  /**
   * ⚠️ **Profile is matched by a LINK ROW, not a heading.** It waited on a
   * `Profile` heading until 2026-08-24, and that heading no longer exists: PR
   * #45 removed it deliberately, because the design gives this screen no title
   * and the invented one painted and then VANISHED when the body arrived
   * (`app/profile/page.tsx`). The probe was never updated, so it sat timing out
   * for 30s on every `npm run e2e:measure`. The screen's real static content is
   * the link rows — match those.
   */
  const NAVS: { name: string; from: string; link: RegExp; shell: (p: Page) => Locator }[] = [
    { name: "→ Closet", from: "/generate", link: /closet/i, shell: (p) => p.getByRole("heading", { name: /the closet/i }) },
    { name: "→ Profile", from: "/closet", link: /profile/i, shell: (p) => p.getByText(/style dna/i) },
    { name: "→ Stylist", from: "/closet", link: /stylist/i, shell: (p) => p.getByRole("heading", { name: /today's looks/i }) },
    { name: "→ Diary", from: "/closet", link: /diary/i, shell: (p) => p.getByRole("heading", { name: /fit diary/i }) },
  ];

  // ⚠️ Match the HEADING, not any text. "Wear Stats" and "Profile" also appear
  // as nav labels and link rows in the streamed BODY — an earlier version of
  // this probe matched those and reported 836ms for a shell that was already
  // painting instantly, which looks like a failure and is a measurement bug.

  for (const nav of NAVS) {
    const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });
    await page.goto(nav.from);
    await page.waitForLoadState("networkidle");

    const t0 = Date.now();
    await page.getByRole("link", { name: nav.link }).first().click();
    await nav.shell(page).first().waitFor({ state: "visible" });
    const shell = Date.now() - t0;
    await page.waitForLoadState("networkidle");
    const complete = Date.now() - t0;

    console.log(`  ${nav.name.padEnd(12)} shell ${String(shell).padStart(4)}ms   complete ${String(complete).padStart(4)}ms`);
    await page.close();
  }
  console.log("");
});

/**
 * Task 0 of the image-weight plan: the bytes a phone actually downloads, per
 * surface, BEFORE the thumbnail derivative exists.
 *
 * ⚠️ **Images, counted separately from everything else.** The plan's stated trap
 * is counting bytes for the WHOLE page: markup is ~30 kB and static across a
 * change that only touches images, so a total-bytes number dilutes the very
 * thing being measured. Both are printed; the image column is the one that moves.
 *
 * ⚠️ **The listener is attached BEFORE `goto`.** The first version of the
 * instant-navigations probe attached late and reported `0 requests, 0.0 kB`,
 * which reads like a triumph and is a bug.
 *
 * ⚠️ **Real-sized images are installed first** — see `installRealisticImages`.
 * The seeded 1×1 PNGs make this measurement vacuous.
 */
test("measure image bytes @measure", async ({ browser }) => {
  const sizes = await installRealisticImages();
  await logWearToday();
  try {
    const userId = await testUserId();
    const { data: item } = await admin()
      .from("items")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "E2E Oxford Shirt")
      .single();

    const SURFACES: { name: string; path: string }[] = [
      { name: "closet grid", path: "/closet" },
      { name: "diary month", path: "/calendar" },
      { name: "item detail", path: `/closet/${item!.id}` },
      { name: "stylist flat-lay", path: "/generate" },
    ];

    console.log(
      `\n  --- image bytes, production build ---` +
        `\n  (fixture per item: cutout ${(sizes.cutout / 1024).toFixed(0)} kB,` +
        ` original ${(sizes.original / 1024).toFixed(0)} kB,` +
        ` thumb ${sizes.thumb === null ? "NONE — run scripts/backfill-thumbs.ts" : `${(sizes.thumb / 1024).toFixed(0)} kB`})\n`,
    );
    console.log(`  ${"surface".padEnd(18)} ${"images".padStart(14)} ${"all requests".padStart(16)}`);

    for (const surface of SURFACES) {
      const page = await browser.newPage({ storageState: "e2e/.auth/state.json" });

      let imgN = 0;
      let imgBytes = 0;
      let allN = 0;
      let allBytes = 0;

      page.on("response", async (res) => {
        try {
          const body = await res.body();
          allN += 1;
          allBytes += body.length;
          if ((res.headers()["content-type"] ?? "").startsWith("image/")) {
            imgN += 1;
            imgBytes += body.length;
          }
        } catch {
          // aborted, redirected or served from cache — no body to weigh
        }
      });

      await page.goto(surface.path);
      await page.waitForLoadState("networkidle");
      // ⚠️ Bodies resolve after networkidle; without this the last few images
      // are counted as 0 bytes.
      await page.waitForTimeout(1500);

      console.log(
        `  ${surface.name.padEnd(18)}` +
          `${`${imgN} / ${(imgBytes / 1024).toFixed(1)} kB`.padStart(14)}` +
          `${`${allN} / ${(allBytes / 1024).toFixed(1)} kB`.padStart(16)}`,
      );
      await page.close();
    }
    console.log("");
  } finally {
    // ⚠️ Always restore, even if a measurement threw — otherwise every later
    // spec runs against a closet full of borrowed images.
    await reseed();
  }
});
