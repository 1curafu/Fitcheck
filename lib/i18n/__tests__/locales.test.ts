import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, SHIPPED_LOCALES, isShippedLocale, localizedPath } from "../locales";

describe("locales", () => {
  it("ships en-US, en-GB and Ukrainian first, from the ten product locales", () => {
    expect(LOCALES).toEqual(["en-US", "en-GB", "uk", "ru", "de", "fr", "it", "pt", "es", "nl"]);
    expect(SHIPPED_LOCALES).toEqual(["en-US", "en-GB", "uk"]);
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
    expect(isShippedLocale("de")).toBe(false);
    expect(isShippedLocale("../x")).toBe(false);
  });
});
