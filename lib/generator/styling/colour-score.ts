import { colorHarmonyScore } from "@/lib/generator/color";
import { temperatureCoherence } from "./temperature";
import { pairingScore } from "./pairing-ratings";
import { echoScore, withAccent } from "./echo";

/**
 * The four colour signals, weighted into one 0..1 score.
 *
 * `harmony` is the ONLY term that always has an opinion, so it carries the base
 * weight and the other three claim their share only when they have evidence —
 * the same "a term with no evidence is dropped, not defaulted to 0.5" contract
 * `climateFit` uses in score.ts. A wardrobe of colours the research never rated
 * therefore scores exactly as it does today, rather than being punished for a
 * gap in someone else's homework.
 *
 * Temperature leads the optional terms because it is the most corroborated
 * finding and the one that fixes the reported defect on its own.
 *
 * ⚠️ UNDOCUMENTED-NO-LONGER: when all three optional terms fire (the common
 * case for a fully-tagged outfit), `harmony` keeps only `1 - 0.3 - 0.25 - 0.15
 * = 0.30` of `colourScore` — and `colourScore` itself is weighted 0.4 into
 * `scoreCombo`, so `harmony`'s share of the FINAL score is `0.4 * 0.30 =
 * 0.12`, down from the 0.40 it carried before these terms existed. This is
 * deliberate, not a regression: `harmony` only measures restraint (how many
 * distinct accents are in play), while temperature, pairing and echo each
 * carry actual research-backed evidence about whether the specific colours
 * chosen work together. A term with no evidence should not outweigh three that
 * have some.
 */
const W_TEMPERATURE = 0.3;
const W_PAIRING = 0.25;
const W_ECHO = 0.15;

/**
 * @param perItemColours the DOMINANT colours of each garment, in order.
 * @param perItemAccents each garment's `accent_color` — a logo, a sole, a
 *   buckle — aligned by index with `perItemColours`. Omit or pass null for a
 *   garment with none.
 *
 * ⚠️ **The accent reaches `echoScore` and nothing else.** It is a tier below a
 * dominant colour, not a peer: `colorHarmonyScore` counts distinct accents
 * against a three-colour ceiling, so folding a swoosh in would make a two-tone
 * sneaker read as a loud outfit; `pairingScore` and `temperatureCoherence`
 * reason about what the garment IS, and a shoelace should not be able to
 * satisfy a colour preference or flip an outfit's temperature. Echo is the one
 * signal that asks "does this small colour pick something else up?", which is
 * exactly what an accent is for.
 *
 * The parameter exists at all because PR #57 moved logos, soles and hardware
 * out of `colors` into `accent_color`, which silently disconnected the echo
 * reward PR #56 had just built — a blue-swoosh sneaker scored identically to a
 * plain white one. Passing accents SEPARATELY rather than concatenating them
 * into `colors` at the call site is what keeps that fix from leaking into the
 * other three terms.
 */
export function colourScore(
  perItemColours: string[][],
  perItemAccents: (string | null | undefined)[] = [],
): number {
  const flat = perItemColours.flat();
  const harmony = colorHarmonyScore(flat);

  const terms: { weight: number; value: number }[] = [];
  // Per-garment, not flattened: a two-tone garment must cast at most one warm
  // and one cool vote. See temperature.ts.
  const temperature = temperatureCoherence(perItemColours);
  if (temperature != null) terms.push({ weight: W_TEMPERATURE, value: temperature });
  const pairing = pairingScore(flat);
  if (pairing != null) terms.push({ weight: W_PAIRING, value: pairing });
  // The ONE term the accent joins. Appended to its own garment's list so echo
  // still counts a colour once per garment, exactly as it did when the tagger
  // wrote the accent into `colors`.
  const echo = echoScore(perItemColours.map((colours, i) => withAccent(colours, perItemAccents[i])));
  if (echo != null) terms.push({ weight: W_ECHO, value: echo });

  const claimed = terms.reduce((sum, t) => sum + t.weight, 0);
  const scored = terms.reduce((sum, t) => sum + t.weight * t.value, 0);
  return Math.min(1, Math.max(0, harmony * (1 - claimed) + scored));
}
