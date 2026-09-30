import { describe, expect, it } from "vitest";
import { amountLabel, centsFor, currencyForTimeZone, DISPLAY_AMOUNTS, displayPrice, LOOKUP_KEYS, monthlyEquivalent, planAmountLabel } from "../prices";

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
    expect(displayPrice("month", "Europe/Berlin")).toEqual({ label: "€5.29 / month", converted: false });
    expect(displayPrice("year", "Europe/Berlin")).toEqual({ label: "€52.90 / year", converted: false });
    expect(displayPrice("year", "Europe/Zurich")).toEqual({ label: "CHF 50 / year", converted: false });
    expect(displayPrice("month", "America/Chicago")).toEqual({ label: "$5.99 / month", converted: false });
  });
  it("keeps lookup keys stable (they are Dashboard identifiers)", () => {
    expect(LOOKUP_KEYS).toEqual({ month: "pro_monthly", year: "pro_annual" });
  });
});

describe("monthlyEquivalent", () => {
  it("shows what the annual plan costs per month, rounded to cents", () => {
    expect(monthlyEquivalent("Europe/Zurich")).toBe("CHF 4.17 / month");
    expect(monthlyEquivalent("Europe/Berlin")).toBe("€4.41 / month");
    expect(monthlyEquivalent("America/New_York")).toBe("$4.99 / month");
  });
});

describe("amountLabel", () => {
  it("shows the bare amount in the viewer's display currency", () => {
    expect(amountLabel(5, "Europe/Berlin")).toBe("€5");
    expect(amountLabel(50, "America/New_York")).toBe("$50");
    expect(amountLabel(0, "Europe/Zurich")).toBe("CHF 0");
    expect(amountLabel(5, undefined)).toBe("CHF 5");
  });
});

describe("planAmountLabel", () => {
  it("reads the viewer's OWN currency price, so per-currency prices can differ", async () => {
    const { planAmountLabel } = await import("../prices");
    const table = { month: { CHF: 5, EUR: 6, USD: 7 }, year: { CHF: 50, EUR: 60, USD: 70 } };
    expect(planAmountLabel("month", "Europe/Zurich", table)).toBe("CHF 5");
    expect(planAmountLabel("month", "Europe/Berlin", table)).toBe("€6");
    expect(planAmountLabel("year", "America/New_York", table)).toBe("$70");
    expect(planAmountLabel("year", undefined, table)).toBe("CHF 50");
  });
});

describe("prices (owner, 2026-09-30: CHF is the main currency; EUR/USD from the ECB rate of 2026-09-29)", () => {
  it("are CHF 5/50, €5.29/€52.90 and $5.99/$59.90", () => {
    expect(DISPLAY_AMOUNTS).toEqual({ month: { CHF: 5, EUR: 5.29, USD: 5.99 }, year: { CHF: 50, EUR: 52.9, USD: 59.9 } });
  });
  it("keep yearly at exactly 10 × monthly in every currency, so '2 months free' stays true", () => {
    for (const c of ["CHF", "EUR", "USD"] as const) expect(centsFor(DISPLAY_AMOUNTS.year[c])).toBe(centsFor(DISPLAY_AMOUNTS.month[c]) * 10);
  });
  it("show cents whenever a price has them", () => {
    expect(planAmountLabel("year", "Europe/Berlin")).toBe("€52.90");
    expect(planAmountLabel("month", "America/New_York")).toBe("$5.99");
    expect(planAmountLabel("month", "Europe/Zurich")).toBe("CHF 5");
    expect(amountLabel(52.9, "Europe/Berlin")).toBe("€52.90");
  });
  it("convert to Stripe cents without floating-point drift (5.29 * 100 is 528.99…)", () => {
    expect([5.29, 52.9, 5.99, 59.9, 5, 50].map(centsFor)).toEqual([529, 5290, 599, 5990, 500, 5000]);
  });
});
