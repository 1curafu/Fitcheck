import { readFileSync } from "node:fs";
import { CURRENT_RELEASE, RELEASE_NOTES, noteFor } from "../release-notes";

test("the newest entry IS the shipped version", () => {
  // ⚠️ Shipping a version with no notes is the failure this catches. The card
  // reads `CURRENT_RELEASE`; if package.json moves and this file does not, users
  // get either nothing or last release's words.
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(RELEASE_NOTES[0].version).toBe(pkg.version);
  expect(CURRENT_RELEASE.version).toBe(pkg.version);
});

test("entries run newest first", () => {
  const dates = RELEASE_NOTES.map((r) => r.date);
  expect([...dates].sort().reverse()).toEqual(dates);
});

test("every entry says something, and says it briefly", () => {
  for (const r of RELEASE_NOTES.flatMap(note => [note, ...Object.values(note.i18n ?? {})])) {
    expect(r.added.length + r.fixed.length).toBeGreaterThan(0);
    for (const line of [...r.added, ...r.fixed]) {
      // A popup is not a changelog page. Long lines mean it stopped being one.
      expect(line.length).toBeLessThanOrEqual(80);
      expect(line).not.toMatch(/^[a-z]/);
    }
  }
});

test("no entry leaks internals at the user", () => {
  // The reason notes are hand-written rather than derived from commits: our
  // subjects name files, functions and weights.
  const jargon = /\b(scoreCombo|rankTopN|null|weight|mutation|tsc|refactor|\.ts)\b/i;
  for (const r of RELEASE_NOTES.flatMap(note => [note, ...Object.values(note.i18n ?? {})])) {
    for (const line of [...r.added, ...r.fixed]) expect(line).not.toMatch(jargon);
  }
});

test("versions are unique", () => {
  const versions = RELEASE_NOTES.map((r) => r.version);
  expect(new Set(versions).size).toBe(versions.length);
});

test.each(["en-GB", "uk"] as const)("latest release has %s text", locale => {
  expect(CURRENT_RELEASE.i18n?.[locale]).toBeDefined();
  expect(noteFor(CURRENT_RELEASE, locale)).toMatchObject(CURRENT_RELEASE.i18n![locale]!);
});
test("older releases fall back to English", () => expect(noteFor(RELEASE_NOTES[1], "uk")).toEqual(RELEASE_NOTES[1]));
