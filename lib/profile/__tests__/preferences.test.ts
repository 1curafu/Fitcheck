import { describe, expect, test } from "vitest";
import { PREFERENCE_DEFAULTS, PreferencesSchema, readPreferences } from "../preferences";

describe("readPreferences", () => {
  test("an empty profile gets safe defaults", () => {
    const p = readPreferences({});
    // Protective behaviour is the default: rain guard already shipped ON inside
    // weatherRules, so defaulting it OFF would silently change how the
    // generator behaves for every existing user.
    expect(p.rainGuard).toBe(true);
    // Celsius, because every stored threshold and the model prompt are Celsius.
    expect(p.tempUnit).toBe("C");
  });

  test("a stored value overrides its default", () => {
    expect(readPreferences({ rainGuard: false }).rainGuard).toBe(false);
    expect(readPreferences({ tempUnit: "F" }).tempUnit).toBe("F");
  });

  test("null or garbage falls back to defaults rather than throwing", () => {
    expect(readPreferences(null).rainGuard).toBe(true);
    expect(readPreferences(undefined).rainGuard).toBe(true);
    expect(readPreferences("nonsense").rainGuard).toBe(true);
    expect(readPreferences(42).tempUnit).toBe("C");
  });

  test("one unreadable field does not discard the others", () => {
    // Whole-object fallback would lose a perfectly good tempUnit because an
    // unrelated key was malformed. Each preference is independent, so a bad
    // write to one must not reset the rest of the screen.
    const p = readPreferences({ rainGuard: "yes", tempUnit: "F" });
    expect(p.rainGuard).toBe(true);
    expect(p.tempUnit).toBe("F");
  });

  test("an out-of-range unit falls back rather than being trusted", () => {
    expect(readPreferences({ tempUnit: "K" }).tempUnit).toBe("C");
  });

  test("unknown keys from a newer client are dropped, not persisted blindly", () => {
    expect(readPreferences({ rainGuard: true, futureThing: 1 })).not.toHaveProperty("futureThing");
  });

  test("a partial patch validates on its own", () => {
    expect(() => PreferencesSchema.partial().parse({ tempUnit: "F" })).not.toThrow();
    expect(() => PreferencesSchema.partial().parse({})).not.toThrow();
  });

  test("a partial patch still rejects a bad value", () => {
    // The write path must not accept what the read path would silently repair —
    // otherwise garbage lands in the column and every later read pays for it.
    expect(() => PreferencesSchema.partial().parse({ tempUnit: "K" })).toThrow();
    expect(() => PreferencesSchema.partial().parse({ rainGuard: "yes" })).toThrow();
  });

  test("every default has a matching field in the strict schema", () => {
    // The lenient read schema mirrors the strict write schema by hand, both
    // reading their fallbacks from PREFERENCE_DEFAULTS. Adding a preference to
    // one and forgetting the other is the drift this pins.
    expect(Object.keys(PREFERENCE_DEFAULTS).sort()).toEqual(
      Object.keys(PreferencesSchema.shape).sort(),
    );
    // And the lenient path must actually return all of them.
    expect(Object.keys(readPreferences({})).sort()).toEqual(
      Object.keys(PREFERENCE_DEFAULTS).sort(),
    );
  });
});
