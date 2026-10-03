import { COLORS } from "@/lib/closet/vocab";
import type { CandidateItem } from "@/lib/generator/candidates";
import { ARCHETYPE_MARKS, type ArchetypeId } from "@/lib/generator/archetype";
import { PALETTE_COLORS, inPalette } from "@/lib/generator/palette";
import { FIT_SUITS, fitSuits } from "@/lib/generator/fit-pref";
import { neutralShare } from "@/lib/stats/advisor";

/** Pieces that carry a style: garments and shoes, never bags, jewellery or fragrance. */
export const GARMENTS = new Set(["Tops", "Bottoms", "One-piece", "Outerwear", "Shoes"]);
const CLOTHING = new Set(["Tops", "Bottoms", "One-piece", "Outerwear"]);
const garmentsOf = (closet: readonly CandidateItem[]) => closet.filter((item) => GARMENTS.has(item.category));

export const MARKED_STYLES = ["Old Money", "Preppy", "Streetwear"] as const;
export type MarkedStyle = (typeof MARKED_STYLES)[number];

/** The styles whose sourced signature marks fire on this piece (Q3). Smart Casual has none by design. */
export function stylesOf(item: CandidateItem): MarkedStyle[] {
  return MARKED_STYLES.filter((style) => ARCHETYPE_MARKS[style]!.signature.some((mark) => mark(item)));
}

export type StyleMix = { garments: number; marked: number; shares: Record<MarkedStyle, number> };

export function styleMix(closet: readonly CandidateItem[]): StyleMix {
  const garments = garmentsOf(closet);
  const counts: Record<MarkedStyle, number> = { "Old Money": 0, Preppy: 0, Streetwear: 0 };
  let marked = 0;
  for (const item of garments) {
    const styles = stylesOf(item);
    if (styles.length) marked++;
    for (const style of styles) counts[style]++;
  }
  const hits = MARKED_STYLES.reduce((sum, style) => sum + counts[style], 0);
  const shares = Object.fromEntries(MARKED_STYLES.map((style) => [style, hits ? counts[style] / hits : 0])) as Record<MarkedStyle, number>;
  return { garments: garments.length, marked, shares };
}

/** Evidence needed before the closet, not the quiz, names the archetype (spec D3). */
export const READING = { minGarments: 8, minMarked: 5, leaderShare: 0.5, markedShare: 0.3 } as const;
export type Reading = { source: "closet"; archetype: ArchetypeId } | { source: "quiz"; archetype: string | null };

export function readCloset(mix: StyleMix, quiz: string | null): Reading {
  if (mix.garments < READING.minGarments || mix.marked < READING.minMarked) return { source: "quiz", archetype: quiz };
  const leader = MARKED_STYLES.reduce((best, style) => (mix.shares[style] > mix.shares[best] ? style : best));
  // A tie is not a lead: 50/50 Preppy/Streetwear reads as the balanced middle.
  const ahead = MARKED_STYLES.every((style) => style === leader || mix.shares[style] < mix.shares[leader]);
  const clear = ahead && mix.shares[leader] >= READING.leaderShare && mix.marked / mix.garments >= READING.markedShare;
  return { source: "closet", archetype: clear ? leader : "Smart Casual" };
}

const HEX = new Map<string, string>(COLORS.map((c) => [c.name, c.hex]));

export function swatches(closet: readonly CandidateItem[], limit = 5): { color: string; hex: string }[] {
  const counts = new Map<string, number>();
  for (const item of garmentsOf(closet)) {
    const color = item.colors[0];
    if (color && HEX.has(color)) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
    .map(([color]) => ({ color, hex: HEX.get(color)! }));
}

type Level<T extends string> = { value: number; level: T } | null;
export type Tendencies = {
  cut: Level<"tailored" | "balanced" | "relaxed">;
  tonal: Level<"strong" | "moderate" | "colourful">;
  pattern: Level<"minimal" | "some" | "bold">;
  heritage: Level<"low" | "some" | "high">;
};

export function tendencies(closet: readonly CandidateItem[]): Tendencies {
  const garments = garmentsOf(closet);
  if (!garments.length) return { cut: null, tonal: null, pattern: null, heritage: null };
  const clothing = garments.filter((item) => CLOTHING.has(item.category));
  const sharp = clothing.filter((item) => item.fit === "Fitted" || item.fit === "Tailored").length;
  const easy = clothing.filter((item) => item.fit === "Relaxed" || item.fit === "Oversized").length;
  const cut = sharp + easy >= 3 ? sharp / (sharp + easy) : null;
  const tonal = neutralShare([...garments]);
  const pattern = garments.filter((item) => (item.pattern ?? "solid") !== "solid").length / garments.length;
  const heritage = garments.filter((item) => stylesOf(item).some((s) => s === "Old Money" || s === "Preppy")).length / garments.length;
  return {
    cut: cut == null ? null : { value: cut, level: cut > 0.6 ? "tailored" : cut < 0.4 ? "relaxed" : "balanced" },
    tonal: { value: tonal, level: tonal >= 0.8 ? "strong" : tonal > 0.6 ? "moderate" : "colourful" },
    pattern: { value: pattern, level: pattern < 0.2 ? "minimal" : pattern < 0.45 ? "some" : "bold" },
    heritage: { value: heritage, level: heritage < 0.2 ? "low" : heritage < 0.45 ? "some" : "high" },
  };
}

/** Pieces needed before "you said X, N% agrees" is a claim worth making. */
export const QUIZ_MIN = 5;
export type QuizCheck = { palette: { answer: string; share: number } | null; fit: { answer: string; share: number } | null };

export function quizVsCloset(closet: readonly CandidateItem[], palette: string | null, fit: string | null): QuizCheck {
  const coloured = garmentsOf(closet).filter((item) => item.colors[0]);
  const cut = garmentsOf(closet).filter((item) => CLOTHING.has(item.category) && item.fit);
  return {
    palette: palette && Object.hasOwn(PALETTE_COLORS, palette) && coloured.length >= QUIZ_MIN
      ? { answer: palette, share: coloured.filter((item) => inPalette(item.colors[0], palette)).length / coloured.length } : null,
    fit: fit && Object.hasOwn(FIT_SUITS, fit) && cut.length >= QUIZ_MIN
      ? { answer: fit, share: cut.filter((item) => fitSuits(item.fit!, fit)).length / cut.length } : null,
  };
}

const NATURAL = new Set(["Cotton", "Wool", "Merino wool", "Cashmere", "Linen", "Silk", "Denim", "Leather", "Suede", "Canvas",
  "Corduroy", "Tweed", "Shearling", "Down"]);
const SYNTHETIC = new Set(["Polyester", "Acrylic", "Nylon", "Fleece", "Faux leather"]);
const NOT_FABRIC = new Set(["Other", "Stainless steel", "Gold", "Silver", "Rubber"]);
export type Fabric = { top: string[]; natural: number; level: "natural" | "mixed" | "synthetic" };

/** Viscose, modal and lyocell are regenerated cellulose: shown in the top three, counted as neither natural nor synthetic. */
export function fabric(closet: readonly CandidateItem[]): Fabric | null {
  const materials = garmentsOf(closet).map((item) => item.material).filter((m): m is string => !!m && !NOT_FABRIC.has(m));
  const known = materials.filter((m) => NATURAL.has(m) || SYNTHETIC.has(m));
  if (known.length < 3) return null;
  const counts = new Map<string, number>();
  for (const m of materials) counts.set(m, (counts.get(m) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([m]) => m);
  const natural = known.filter((m) => NATURAL.has(m)).length / known.length;
  return { top, natural, level: natural >= 0.6 ? "natural" : natural >= 0.3 ? "mixed" : "synthetic" };
}

export type Opening = "oldMoney" | "preppy" | "streetwear" | "smartCasual" | "fresh";
const OPENINGS: Record<string, Opening> = { "Old Money": "oldMoney", Preppy: "preppy", Streetwear: "streetwear", "Smart Casual": "smartCasual" };

/** Message keys for the card's italic line: `styleDna.opening.<opening>` + `styleDna.trait.<trait>` (spec D2). */
export function blurbKeys(reading: Reading, t: Tendencies): { opening: Opening; trait: string } {
  const opening = (reading.archetype && OPENINGS[reading.archetype]) || "fresh";
  const tone = t.tonal?.level === "strong" ? "tonal" : t.tonal?.level === "colourful" ? "colourful" : "mixed";
  const cut = t.cut?.level === "tailored" ? "Tailored" : t.cut?.level === "relaxed" ? "Relaxed" : "Balanced";
  return { opening, trait: `${tone}${cut}` };
}
