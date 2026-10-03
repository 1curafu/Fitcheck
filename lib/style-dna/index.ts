import type { CandidateItem } from "@/lib/generator/candidates";
import { blurbKeys, fabric, quizVsCloset, readCloset, styleMix, swatches, tendencies } from "./closet";
import { dressy, formula, pairing, signature, statTrio, wornLooks } from "./worn";

export type { Reading, Tendencies } from "./closet";
export type { PieceKind } from "./kinds";

export type StyleDnaInput = {
  closet: CandidateItem[];
  quiz: { archetype: string | null; palette: string | null; fit: string | null };
  logs: { outfit_id: string | null }[];
  outfits: { id: string; occasion: string | null }[];
  pieces: { outfit_id: string; item_id: string }[];
};

/** Every Style DNA section from the user's own rows; pure and deterministic (spec §3). */
export function buildStyleDna({ closet, quiz, logs, outfits, pieces }: StyleDnaInput) {
  const looks = wornLooks(closet, logs, outfits, pieces);
  const mix = styleMix(closet);
  const reading = readCloset(mix, quiz.archetype);
  const traits = tendencies(closet);
  return {
    reading, quizArchetype: quiz.archetype, mix, swatches: swatches(closet), trio: statTrio(closet, looks),
    blurb: blurbKeys(reading, traits), tendencies: traits, quiz: quizVsCloset(closet, quiz.palette, quiz.fit),
    fabric: fabric(closet), formula: formula(looks), pairing: pairing(looks), dressy: dressy(closet, looks), signature: signature(looks),
  };
}
export type StyleDna = ReturnType<typeof buildStyleDna>;
