import type { UiOccasion } from "./types";

export type Weather = {
  /** The temperature RIGHT NOW. Display, and the fallback when no day range exists. */
  tempC: number;
  rain: boolean;
  /**
   * Today's high and low.
   *
   * The daily drop is generated once and worn all day, so scoring against
   * `tempC` optimises for the minute the user happened to open the app. On
   * 2026-08-14 that produced a cable-knit sweater at 07:45 for a day that
   * reached 34.8°C. **The look is built for the HIGH; the cold end of the day is
   * handled by advice, not by the outfit** — otherwise a 22°-afternoon /
   * 9°-morning day puts a coat in every flat-lay you see at 3pm.
   *
   * Optional: fixtures and any caller without a forecast fall back to `tempC`.
   */
  highC?: number;
  lowC?: number;
};

/** The temperature the LOOK is built for. */
export function planningTemp(w: Weather): number {
  return w.highC ?? w.tempC;
}

// v2 UI occasions → formality bands (Decision D9, widened — see below).
//
// An occasion is CONTEXT, not a dress code. "Evening" covers both a casual date
// and a black-tie dinner; "Work" covers both a creative studio in sneakers and a
// boardroom. What separates them is the user's dress code, which onboarding
// already collects (profiles.formality_min/max) and personalBand() applies.
// Narrow per-occasion bands used to encode one assumed dress code for everyone,
// which left a smart-casual wardrobe unable to produce a Work or Evening outfit
// at all. Every band now includes 3 (smart casual) — a legitimate answer anywhere.
const BANDS: Record<UiOccasion, [number, number]> = {
  everyday: [1.5, 3],
  work: [2, 4.5],
  weekend: [1, 3.5],
  evening: [2.5, 5],
};

export function occasionBand(o: UiOccasion): [number, number] {
  return BANDS[o];
}

export type DressCodeRange = {
  formality_min?: number | null;
  formality_max?: number | null;
};

/**
 * The occasion band narrowed to the dress codes the user picked in onboarding
 * (`profiles.formality_min/max`, derived from `dress_codes`).
 *
 * This is the answer the quiz already collects and the generator previously
 * ignored: someone who said "Smart casual" was still asked for 3.5–5 on Evening
 * and got nothing. Padded by ±0.5 so a single dress code isn't a knife-edge, and
 * falls back to the plain occasion band when there's no overlap at all (e.g. a
 * black-tie-only wardrobe asking for Everyday) — better a slightly-off outfit
 * than none.
 */
export function personalBand(
  o: UiOccasion,
  profile?: DressCodeRange | null,
): [number, number] {
  const [olo, ohi] = occasionBand(o);
  const min = profile?.formality_min;
  const max = profile?.formality_max;
  if (min == null || max == null) return [olo, ohi];

  const lo = Math.max(olo, Math.max(1, min - 0.5));
  const hi = Math.min(ohi, Math.min(5, max + 0.5));
  return lo > hi ? [olo, ohi] : [lo, hi];
}

/**
 * An explicit Refine formality (1..5) REPLACES the band with that level ±1.
 *
 * It replaces rather than intersects because Refine is an explicit instruction:
 * previously it was capped at the occasion's ceiling, so a smart-casual profile
 * could never ask for a black-tie outfit no matter what it selected.
 */
export function applyFormalityOverride(
  band: [number, number],
  f: number | null,
): [number, number] {
  if (f == null) return band;
  return [Math.max(1, f - 1), Math.min(5, f + 1)];
}

/**
 * Fabrics that are wrong in real heat NO MATTER HOW THEY ARE MADE.
 *
 * This is the measured replacement for the season tag's incidental thermal
 * protection: season used to be a hard filter, so a sweater tagged
 * {Autumn,Winter} could never reach a July outfit. Season is now a preference
 * (see ./season.ts), so the guard moved to the temperature we already fetch.
 *
 * The list is deliberately SHORT, and notably does not contain wool.
 * Whether a wool garment suits 30°C is decided by its weight and weave, not its
 * fibre: tropical, fresco and high-twist wools are summer suiting, and merino is
 * used *for* heat because it wicks and breathes. `items.material` is a bare
 * fibre name today, so a "wool" rule cannot tell a summer-weight trouser from a
 * melton coat — it would exclude exactly the smart-casual work wear this app is
 * built around. Everything left here is insulation or a coarse heavy weave,
 * where no construction makes it summer-appropriate.
 *
 * Wool, merino and cashmere are not unprotected: an off-season piece still takes
 * the `seasonFit` penalty in scoring, so it ranks below linen in July. Demoted
 * on evidence rather than eliminated on a guess — the same argument this module
 * makes about season itself.
 *
 * That fix has now landed. Warmth is a SCORED signal — `lib/generator/texture.ts`
 * reads material × texture against the real temperature — so this list is no
 * longer where warmth is decided. What remains is only what must never reach a
 * hot day at all: a soft term demotes, and `diversify` still fills 20 shortlist
 * slots, so without this a down jacket can surface at 32°C. There is a real
 * difference between *slightly off-season*, which this project deliberately
 * accepts, and *physically wrong*. `eligibleByCategory`'s relief rule keeps it
 * safe — this can narrow a required slot but can never empty one.
 *
 * `tweed` left with that change: its warmth now lives in `MATERIAL_WARMTH`, so
 * a tweed jacket is scored down in heat rather than banned outright — the same
 * treatment wool already gets, and for the same reason. `quilted` and `puffer`
 * left because neither ever matched: `Quilted` is a TEXTURE, and `puffer` is in
 * no vocabulary at all. They had been dead since `material` became an enum.
 */
const HOT_MATERIALS = ["fleece", "shearling", "down"];

/** Strictly above 25: 24° is pleasant, 26° is hot. */
const HOT_C = 25;

/**
 * Below this the LOOK carries outerwear.
 *
 * Exported because `laterAdvice` needs the same number: the advice strip must
 * never tell you to take a layer the flat-lay already contains. Two copies of
 * 15 would drift, and the drift would be invisible — the sentence would simply
 * start disagreeing with the picture beside it.
 */
export const OUTERWEAR_C = 15;

/** Materials rain ruins. Turned off by the rain-guard preference, nothing else. */
const WET_MATERIALS = ["suede", "canvas"];

/**
 * Above this, a garment's computed warmth stops being a penalty and becomes a bar.
 *
 * `HOT_MATERIALS` only catches insulation by FIBRE, which is why a cotton
 * cable-knit sweater reached a 34.8°C day on 2026-08-14. Measured on the real
 * 21-item closet: the warmth term demoted that combo from #13 to #22 of 66, but
 * `diversify` fills 20 shortlist slots out of 66 combos — so 30% of everything
 * reaches the model and a demotion changes nothing. This is the hole the plan
 * named: *"a soft term demotes, and diversify still fills 20 slots."*
 *
 * Safe as a hard rule because it reads `itemWarmth`, which now respects the
 * wearer's own season tags — a Summer-tagged cable knit is 0.55 and survives,
 * an Autumn/Winter one is 0.65 and does not — and because
 * `eligibleByCategory`'s relief rule guarantees it can narrow a required slot
 * but never empty one.
 */
const SWELTERING_C = 28;
const SWELTERING_MAX_WARMTH = 0.6;

/**
 * @param prefs `rainGuard` is the settings toggle. It defaults ON: the
 * protective behaviour shipped before the switch existed, so an absent
 * preference must preserve it rather than opt the whole userbase out.
 *
 * The toggle reaches the WET list only. The heat exclusions are about comfort
 * at 30°, not about keeping shoes dry, and `needsOuterwear` is about cold — a
 * switch labelled "never suede in the rain" has no business touching either.
 *
 * Everything thermal here reads `planningTemp` — the day's HIGH — not the
 * current temperature. Rain is the exception: it is read from `rain`, which is
 * about the hour you step outside.
 */
export function weatherRules(w: Weather, prefs?: { rainGuard?: boolean }) {
  const rainGuard = prefs?.rainGuard ?? true;
  const planning = planningTemp(w);
  return {
    needsOuterwear: planning < OUTERWEAR_C,
    excludeMaterials: [
      ...(w.rain && rainGuard ? WET_MATERIALS : []),
      ...(planning > HOT_C ? HOT_MATERIALS : []),
    ],
    /** null = warmth is a preference today, as it is on all but the hottest days. */
    maxWarmth: planning > SWELTERING_C ? SWELTERING_MAX_WARMTH : null,
  };
}
