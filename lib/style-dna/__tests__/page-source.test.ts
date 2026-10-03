import { readFileSync } from "node:fs";

const page = readFileSync("app/[locale]/style-dna/page.tsx", "utf8");

test("history is read in full and per worn look, never as one capped request (PR #159 review)", () => {
  const history = readFileSync("lib/style-dna/history.ts", "utf8");
  expect(history).toMatch(/from\("wear_logs"\)\.select\("id, outfit_id"\)/);
  expect(history).toMatch(/from\("outfit_items"\)\.select\("outfit_id, item_id"\)\.in\("outfit_id", chunk\)/);
  expect(history).not.toMatch(/outfit_items!inner/);
  expect(page).toMatch(/readWearHistory\(supabase, user\.id\)/);
  expect(page).toMatch(/readAll<[^>]*>\(\(from, to\) =>\s*supabase\.from\("items"\)/);
  // No unbounded history read left on the page itself.
  expect(page).not.toMatch(/from\("(wear_logs|outfits|outfit_items)"\)/);
});

test("a failed profile read is an error, not a free user with no quiz answers (PR #159 review)", () => {
  expect(page).toMatch(/if \(profileRes\.error\) throw new Error\(profileRes\.error\.message\)/);
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
