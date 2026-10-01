import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every producer of a candidate must go through `toCandidateItem`.
 *
 * ⚠️ A SOURCE-level test, deliberately, and the reason is that no other kind can
 * work here. Every field on `CandidateItem` is optional — a convention worth
 * keeping, since making two of them required costs 113 type errors across ~100
 * fixtures — so an inline literal that forgets `branding` compiles. The literals
 * are inferred and passed structurally, so no excess-property check fires. And
 * the producers are server actions and a page, which have no unit coverage.
 *
 * That combination is exactly how `bulk` and `accent_color` each shipped tagged,
 * stored, displayed and read by nothing. A branch mutation sweep found eight
 * such survivors at once. This file is the guard the type system cannot be.
 *
 * Precedent: `e2e/shell-privacy.spec.ts` inspects the prerendered artefacts on
 * disk for the same reason — the artefact IS the thing that matters.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(path) && !path.endsWith("from-row.ts")) out.push(path);
  }
  return out;
}

const FILES = [...sourceFiles("app"), ...sourceFiles("lib")].map((path) => ({
  path,
  text: readFileSync(path, "utf8"),
}));

test("every CandidateItem list is built by the shared mapper", () => {
  const offenders: string[] = [];
  for (const { path, text } of FILES) {
    for (const m of text.matchAll(/:\s*CandidateItem\[\]\s*=\s*([\s\S]*?);/g)) {
      if (!m[1].includes("toCandidateItem")) offenders.push(`${path}: ${m[1].trim().slice(0, 60)}`);
    }
  }
  expect(offenders).toEqual([]);
});

test("nothing casts a raw row to a candidate", () => {
  // The packing actions did exactly this, so a column missing from the select
  // was undefined at runtime with nothing to notice.
  const offenders = FILES.filter(({ text }) => /as\s+(unknown\s+as\s+)?CandidateItem\b/.test(text))
    .map(({ path }) => path);
  expect(offenders).toEqual([]);
});

test("the guard can actually see a violation", () => {
  // ⚠️ Proves the regexes match real code rather than silently finding nothing —
  // the failure mode that would make both tests above vacuous.
  const bad = "  const closet: CandidateItem[] = items.map((i) => ({ id: i.id }));";
  expect([...bad.matchAll(/:\s*CandidateItem\[\]\s*=\s*([\s\S]*?);/g)].length).toBe(1);
  expect(FILES.some(({ text }) => /:\s*CandidateItem\[\]\s*=/.test(text))).toBe(true);
});

test("every caller of buildCandidates hands it the user's no-gos", () => {
  // ⚠️ Source-level for the same reason as above: `nogos` is optional, so a producer that forgets it
  // compiles and silently ignores the quiz — the exact defect this feature exists to fix.
  const callers = FILES.filter(({ path, text }) => /buildCandidates\(/.test(text) && !path.endsWith("candidates.ts"));
  expect(callers.length).toBeGreaterThanOrEqual(3);
  // `nogos:` as a PROPERTY — the daily action also names the column in its select string, which a bare
  // word match would accept even with the argument deleted.
  expect(callers.filter(({ text }) => !/\bnogos\s*:/.test(text)).map(({ path }) => path)).toEqual([]);
});

test("the styled-look producer exempts the piece the user asked to style from their own no-gos", () => {
  // ⚠️ Source-level, as above: a server action with no unit coverage. Without the exemption, styling a piece
  // the user later ruled out would find no look containing it and answer "thin closet" for a piece they own.
  const styled = FILES.find(({ path }) => path.endsWith("style-actions.ts"));
  expect(styled?.text).toMatch(/keepItemIds:\s*\[itemId\]/);
});

test("the daily action re-checks the STORED set against the no-gos before serving it", () => {
  // ⚠️ Source-level: a stored look is served without rebuilding, so a piece retagged Ripped/Large/Fitted after the
  // drop was generated would otherwise stay in today's look until midnight.
  const daily = FILES.find(({ path }) => path.endsWith("generate/actions.ts"));
  expect(daily?.text).toMatch(/const storedBreaksNogo = [^;]*storedLooksBlocked\(/);
  // …and its result must gate serving the stored set, not just be computed.
  expect(daily?.text).toMatch(/!storedBreaksNogo/);
});

test("the styled-look action re-checks its CACHED looks and explains a no-go emptiness", () => {
  // ⚠️ Source-level: a cached styled set is served with no rebuild, so a companion retagged Ripped/Large/Fitted
  // after styling stayed in the look all day; and a piece whose companions were all ruled out was told
  // "add more pieces" (thinCloset) although the closet was fine.
  const styled = FILES.find(({ path }) => path.endsWith("style-actions.ts"))!.text;
  // the shared, fail-closed check (a failed read throws) — not an inline query that can drop its error
  expect(styled).toMatch(/cachedBreaksNogo = await styledCacheBreaksNogo\(/);
  expect(styled).toMatch(/if \(cached\.length && !cachedBreaksNogo\)/);
  expect(styled).toMatch(/emptiedByNogos\(/);
  expect(styled).toContain("item.style.nogos");
});

test("every producer that ranks or scores looks hands it the palette and fit answers", () => {
  // ⚠️ Source-level, as with `nogos:` — both keys are optional, so a producer that forgets them compiles and silently
  // ignores the quiz (quiz part 2).
  const callers = FILES.filter(({ path, text }) => /\b(rankTopN|scoreCombo)\(/.test(text) && !path.includes("lib/generator/"));
  expect(callers.length).toBeGreaterThanOrEqual(3);
  expect(callers.filter(({ text }) => !/\bpalette\s*:/.test(text) || !/\bfitPref\s*:/.test(text)).map(({ path }) => path)).toEqual([]);
});
