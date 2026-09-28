import { expect, it } from "vitest";
import { pendingLocaleForUser, withLocale } from "../preference";

it("saves locale and defaults units only when no stored unit exists", () => {
  expect(withLocale({}, "en-US")).toMatchObject({ locale: "en-US", tempUnit: "F" });
  expect(withLocale({}, "uk")).toMatchObject({ locale: "uk", tempUnit: "C" });
  expect(withLocale({ tempUnit: "C" }, "en-US")).toMatchObject({ tempUnit: "C" });
  expect(withLocale({ tempUnit: "F" }, "uk")).toMatchObject({ tempUnit: "F" });
  expect(withLocale({ rainGuard: false, tempUnit: "C" }, "en-US")).toMatchObject({ rainGuard: false, tempUnit: "C" });
  expect(withLocale({ rainGuard: false, wearAskedOn: "2026-09-27" }, "uk")).toMatchObject({ rainGuard: false, wearAskedOn: "2026-09-27" });
});

it("accepts pending choices only for the authenticated account", () => {
  expect(pendingLocaleForUser("user:uk", "user")).toBe("uk");
  for (const value of [undefined, "other:uk", "user:de", "user", "user:uk:extra"]) {
    expect(pendingLocaleForUser(value, "user")).toBeUndefined();
  }
});
