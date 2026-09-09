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
