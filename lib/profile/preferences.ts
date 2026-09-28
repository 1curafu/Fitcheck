import { z } from "zod";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";

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
  /** The local date the evening wear confirmation was last ANSWERED. */
  wearAskedOn: null,
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
  /** UI language, mirrored in NEXT_LOCALE and auth user_metadata. Absence is meaningful. */
  locale: z.enum(SHIPPED_LOCALES).optional(),
  rainGuard: z.boolean().default(PREFERENCE_DEFAULTS.rainGuard),
  tempUnit: z.enum(["C", "F"]).default(PREFERENCE_DEFAULTS.tempUnit),
  /**
   * Not a toggle — bookkeeping. Set by BOTH answers to the evening
   * confirmation, so the question is asked at most once a day whichever way it
   * went. Null means never answered.
   */
  wearAskedOn: z.string().nullable().default(PREFERENCE_DEFAULTS.wearAskedOn),
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
  locale: PreferencesSchema.shape.locale.catch(undefined),
  rainGuard: PreferencesSchema.shape.rainGuard.catch(PREFERENCE_DEFAULTS.rainGuard),
  tempUnit: PreferencesSchema.shape.tempUnit.catch(PREFERENCE_DEFAULTS.tempUnit),
  wearAskedOn: PreferencesSchema.shape.wearAskedOn.catch(PREFERENCE_DEFAULTS.wearAskedOn),
});

/** Read the stored bag, repairing anything unreadable. */
export function readPreferences(raw: unknown): Preferences {
  const source = raw && typeof raw === "object" ? raw : {};
  return LenientSchema.parse(source);
}

/** Repair stored fields without inventing a unit choice during an unrelated save. */
export function mergePreferencesForSave(raw: unknown, patch: unknown): Omit<Preferences, "tempUnit"> & { tempUnit?: "C" | "F" } {
  const parsed = PreferencesSchema.partial().parse(patch);
  // Zod applies nested defaults even inside partial(). Only supplied patch keys may override storage.
  const supplied = Object.fromEntries(Object.entries(parsed).filter(([key]) => Object.hasOwn(patch as object, key)));
  const next: Omit<Preferences, "tempUnit"> & { tempUnit?: "C" | "F" } = { ...readPreferences(raw), ...supplied };
  const storedUnit = raw !== null && typeof raw === "object" && Object.hasOwn(raw, "tempUnit");
  if (!storedUnit && !Object.hasOwn(patch as object, "tempUnit")) delete next.tempUnit;
  return next;
}
