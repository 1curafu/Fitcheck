import { readFileSync } from "node:fs";
import { CURRENT_RELEASE, MORE_NOTES_FOR_TEST, RELEASE_NOTES, noteFor } from "../release-notes";
import { CONTENT_LOCALES } from "@/lib/i18n/__tests__/content-locales";

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

const LOCALIZED = CONTENT_LOCALES.filter(l => l !== "en-US");

test.each(LOCALIZED)("latest release has %s text", locale => {
  expect(CURRENT_RELEASE.i18n?.[locale]).toBeDefined();
  expect(noteFor(CURRENT_RELEASE, locale)).toMatchObject(CURRENT_RELEASE.i18n![locale]!);
});
test.each(LOCALIZED.filter(l => l !== "en-GB"))("every historical release has complete %s text with unchanged claims", locale => {
  for (const note of RELEASE_NOTES) {
    expect(note.i18n?.[locale]?.headline.trim(), `${note.version} lacks ${locale}`).toBeTruthy();
    const translated = noteFor(note, locale);
    expect(translated.added).toHaveLength(note.added.length);
    expect(translated.fixed).toHaveLength(note.fixed.length);
    expect(translated.version).toBe(note.version);
    expect(translated.date).toBe(note.date);
  }
});
test("no per-locale release map names a version that does not exist", () => {
  const versions = new Set(RELEASE_NOTES.map(n => n.version));
  for (const [locale, map] of Object.entries(MORE_NOTES_FOR_TEST)) for (const v of Object.keys(map ?? {})) expect(versions.has(v), `${locale} ${v}`).toBe(true);
});
test("British release history avoids American-specific terms", () => {
 for (const note of RELEASE_NOTES) {
  const translated=noteFor(note,"en-GB");
  expect([translated.headline,...translated.added,...translated.fixed].join(" ")).not.toMatch(/\b(closet|sneakers|color|favorite)\b/i);
 }
});
