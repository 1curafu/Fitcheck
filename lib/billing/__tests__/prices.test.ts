import { describe, expect, it } from "vitest";
import { currencyForTimeZone, displayPrice, LOOKUP_KEYS, monthlyEquivalent } from "../prices";

describe("currencyForTimeZone", () => {
  it.each([["Europe/Zurich", "CHF"], ["Europe/Vaduz", "CHF"], ["Europe/Berlin", "EUR"], ["Europe/Paris", "EUR"],
    ["Europe/Lisbon", "EUR"], ["America/New_York", "USD"], ["America/Los_Angeles", "USD"], ["Pacific/Honolulu", "USD"],
    ["America/Indiana/Indianapolis", "USD"]])(
    "%s → %s", (tz, c) => expect(currencyForTimeZone(tz)).toEqual({ currency: c, converted: false }));
  it.each(["Europe/London", "Asia/Tokyo", "America/Toronto", undefined, ""])(
    "%s falls back to CHF, converted at checkout", (tz) =>
      expect(currencyForTimeZone(tz)).toEqual({ currency: "CHF", converted: true }));
});

describe("displayPrice", () => {
  it("formats month and year per currency", () => {
    expect(displayPrice("month", "Europe/Berlin")).toEqual({ label: "€5 / month", converted: false });
    expect(displayPrice("year", "Europe/Zurich")).toEqual({ label: "CHF 50 / year", converted: false });
    expect(displayPrice("month", "America/Chicago")).toEqual({ label: "$5 / month", converted: false });
  });
  it("keeps lookup keys stable (they are Dashboard identifiers)", () => {
    expect(LOOKUP_KEYS).toEqual({ month: "pro_monthly", year: "pro_annual" });
  });
});

describe("monthlyEquivalent", () => {
  it("shows what the annual plan costs per month, rounded to cents", () => {
    expect(monthlyEquivalent("Europe/Zurich")).toBe("CHF 4.17 / month");
    expect(monthlyEquivalent("Europe/Berlin")).toBe("€4.17 / month");
  });
});
