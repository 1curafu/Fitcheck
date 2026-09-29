import { describe, expect, it } from "vitest";
import { routing } from "../routing";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, LOCALE_PREFIXES, SHIPPED_LOCALES, isShippedLocale, localizedPath } from "../locales";

describe("locales", () => {
  it("ships all ten product locales", () => {
    expect(LOCALES).toEqual(["en-US", "en-GB", "uk", "ru", "de", "fr", "it", "pt", "es", "nl"]);
    expect(SHIPPED_LOCALES).toEqual(LOCALES);
    expect(DEFAULT_LOCALE).toBe("en-US");
  });
  it("names every language in its own language", () => {
    expect(LOCALE_NAMES).toMatchObject({ "en-US": "English (US)", "en-GB": "English (UK)", uk: "Українська", de: "Deutsch" });
    expect(Object.keys(LOCALE_NAMES)).toEqual([...LOCALES]);
  });
  it("prefixes every locale but the default", () => {
    expect(localizedPath("en-US", "/closet")).toBe("/closet");
    expect(localizedPath("en-GB", "/closet")).toBe("/en-gb/closet");
    expect(localizedPath("uk", "/")).toBe("/uk");
    expect(localizedPath("uk", "/generate?occasion=work")).toBe("/uk/generate?occasion=work");
  });
  it("accepts only shipped locales", () => {
    expect(isShippedLocale("uk")).toBe(true);
    expect(isShippedLocale("de")).toBe(true);
    expect(isShippedLocale("pt-BR")).toBe(false);
    expect(isShippedLocale("xx")).toBe(false);
    expect(isShippedLocale("../x")).toBe(false);
  });
  it("routing prefixes are exactly the non-empty locale prefixes", () => {
    expect(routing.localePrefix).toMatchObject({ mode: "as-needed",
      prefixes: Object.fromEntries(Object.entries(LOCALE_PREFIXES).filter(([, p]) => p)) });
    expect(localizedPath("pt", "/closet?x=1")).toBe("/pt/closet?x=1");
    expect(localizedPath("de", "/")).toBe("/de");
  });
});
