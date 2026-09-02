import { colorHarmonyScore } from "@/lib/generator/color";
import { temperatureCoherence } from "./temperature";
import { pairingScore } from "./pairing-ratings";
import { echoScore } from "./echo";

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

export function colourScore(perItemColours: string[][]): number {
  const flat = perItemColours.flat();
  const harmony = colorHarmonyScore(flat);

  const terms: { weight: number; value: number }[] = [];
  // Per-garment, not flattened: a two-tone garment must cast at most one warm
  // and one cool vote. See temperature.ts.
  const temperature = temperatureCoherence(perItemColours);
  if (temperature != null) terms.push({ weight: W_TEMPERATURE, value: temperature });
  const pairing = pairingScore(flat);
  if (pairing != null) terms.push({ weight: W_PAIRING, value: pairing });
  const echo = echoScore(perItemColours);
  if (echo != null) terms.push({ weight: W_ECHO, value: echo });

  const claimed = terms.reduce((sum, t) => sum + t.weight, 0);
  const scored = terms.reduce((sum, t) => sum + t.weight * t.value, 0);
  return Math.min(1, Math.max(0, harmony * (1 - claimed) + scored));
}
