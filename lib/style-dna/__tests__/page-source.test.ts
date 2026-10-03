import { readFileSync } from "node:fs";

const page = readFileSync("app/[locale]/style-dna/page.tsx", "utf8");

test("wear logs and look pieces are read separately: the embed returns zero rows silently (stats/page.tsx, PR #22)", () => {
  expect(page).toMatch(/from\("wear_logs"\)\s*\.select\("outfit_id"\)/);
  expect(page).toMatch(/from\("outfit_items"\)\s*\.select\("outfit_id, item_id"\)/);
  expect(page).not.toMatch(/outfit_items!inner/);
});

test("the body authenticates and the shell holds no user data", () => {
  expect(page).toMatch(/auth\.getUser\(\)/);
  expect(page).toMatch(/<Suspense fallback=\{<ScreenHeader/);
});

test("/style-dna is walked by the insights gate and the shell-privacy check", () => {
  expect(readFileSync("e2e/walk.spec.ts", "utf8")).toContain('"/style-dna"');
  expect(readFileSync("e2e/shell-privacy.spec.ts", "utf8")).toContain('"/style-dna"');
});

test("Profile links to the built page", () => {
  expect(readFileSync("app/[locale]/profile/page.tsx", "utf8")).toMatch(/href: "\/style-dna",\s*key: "styleDna",\s*icon: "dna",\s*ready: true/);
});
