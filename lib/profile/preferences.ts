import { z } from "zod";

/**
 * Defaults, declared once and referenced by both schemas below.
 *
 * `rainGuard` is ON because the protective behaviour already shipped inside
 * `weatherRules` — defaulting it off would silently change the generator for
 * every existing user. `tempUnit` is Celsius because every stored threshold,
 * and the text sent to the model, is Celsius; the unit is a display choice and
 * never reaches the rules.
 */
export const PREFERENCE_DEFAULTS = {
  rainGuard: true,
  tempUnit: "C",
} as const;

/**
 * The STRICT schema — the write path.
 *
 * `PreferencesSchema.partial()` validates an incoming patch, and it must reject
 * a bad value rather than quietly repairing it: garbage accepted here is stored
 * forever and paid for on every later read.
 *
 * Only preferences something actually reads belong here. A stored flag that no
 * code consults is a switch that lies to the user.
 */
export const PreferencesSchema = z.object({
  rainGuard: z.boolean().default(PREFERENCE_DEFAULTS.rainGuard),
  tempUnit: z.enum(["C", "F"]).default(PREFERENCE_DEFAULTS.tempUnit),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

/**
 * The LENIENT mirror — the read path.
 *
 * `.catch()` sits on each field rather than on the object, so one malformed
 * value falls back on its own instead of discarding every other preference
 * alongside it. Defaults come from the same constant as the strict schema, and
 * `preferences.test.ts` asserts the two schemas keep identical keys, so adding
 * a preference to one and forgetting the other fails the suite.
 */
const LenientSchema = z.object({
  rainGuard: PreferencesSchema.shape.rainGuard.catch(PREFERENCE_DEFAULTS.rainGuard),
  tempUnit: PreferencesSchema.shape.tempUnit.catch(PREFERENCE_DEFAULTS.tempUnit),
});

/** Read the stored bag, repairing anything unreadable. */
export function readPreferences(raw: unknown): Preferences {
  const source = raw && typeof raw === "object" ? raw : {};
  return LenientSchema.parse(source);
}
