import { describe, expect, test } from "vitest";
import { formatTemp, toFahrenheit } from "../format";

describe("toFahrenheit", () => {
  test("converts the fixed points", () => {
    expect(toFahrenheit(0)).toBe(32);
    expect(toFahrenheit(100)).toBe(212);
    expect(toFahrenheit(-40)).toBe(-40);
  });

  test("rounds to a whole degree", () => {
    // 18°C is 64.4°F — a weather strip shows no decimals.
    expect(toFahrenheit(18)).toBe(64);
    expect(toFahrenheit(21)).toBe(70);
  });

  test("handles temperatures below freezing", () => {
    expect(toFahrenheit(-5)).toBe(23);
  });
});

describe("formatTemp", () => {
  test("Celsius passes the stored value straight through", () => {
    expect(formatTemp(18, "C")).toBe("18°");
  });

  test("Fahrenheit converts", () => {
    expect(formatTemp(18, "F")).toBe("64°");
  });

  test("the degree sign is bare in both units, as the design draws it", () => {
    // The unit is established by the Settings screen, not repeated on every
    // number — `Fitcheck.dc.html` prints `18°` on the weather strip.
    expect(formatTemp(18, "C")).not.toContain("C");
    expect(formatTemp(18, "F")).not.toContain("F");
  });

  test("defaults to Celsius when no unit is given", () => {
    // Every existing call site passes one argument; the default must not
    // silently reinterpret a stored Celsius value as Fahrenheit.
    expect(formatTemp(18)).toBe("18°");
  });

  test("a fractional reading is rounded, not printed raw", () => {
    expect(formatTemp(18.6, "C")).toBe("19°");
    expect(formatTemp(18.6, "F")).toBe("65°");
  });
});
