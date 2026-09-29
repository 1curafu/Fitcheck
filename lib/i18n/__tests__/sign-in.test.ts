import { expect, it } from "vitest";
import { resolveSignInLocale } from "../sign-in";

it("prefers the account's saved language", () => expect(resolveSignInLocale("uk", "en-GB")).toEqual({ locale: "uk", save: false }));
it("retries a failed switch for this account", () => expect(resolveSignInLocale("en-GB", "en-GB", "uk")).toEqual({ locale: "uk", save: true }));
it("saves the browsing language when the account has none", () => expect(resolveSignInLocale(undefined, "uk")).toEqual({ locale: "uk", save: true }));
it("saves en-US when nothing is known", () => expect(resolveSignInLocale(undefined, undefined)).toEqual({ locale: "en-US", save: true }));
it("ignores unshipped or invalid preferences", () => expect(resolveSignInLocale("pl", "../x")).toEqual({ locale: "en-US", save: true }));
