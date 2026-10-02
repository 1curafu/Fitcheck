import { z } from "zod";
import { NOGO_VALUES, type NoGo } from "@/lib/generator/nogos";
import { QUESTIONS, type QuestionId } from "./questions";

/**
 * The six quiz answers, one definition for both doors that write them (onboarding and the Style profile
 * editor). Writes are STRICT — an unknown value is rejected, never stored. Reads are LENIENT — a profile
 * saved before a value was retired (`bright`, `square_toe`) still loads, minus that value.
 */
const valuesOf = (id: QuestionId) => QUESTIONS.find((q) => q.id === id)!.options.map((o) => o.value) as [string, ...string[]];
const one = (id: QuestionId) => z.enum(valuesOf(id));
const unique = <T,>(xs: T[]) => [...new Set(xs)];

export const StyleProfileSchema = z.object({
  archetype: one("archetype"),
  palette: one("palette"),
  fit: one("fit"),
  dress_codes: z.array(one("dress_codes")).min(1).transform(unique),
  occasions: z.array(one("occasions")).min(1).transform(unique),
  nogos: z.array(z.enum(NOGO_VALUES)).transform(unique),
});
export type StyleProfile = z.output<typeof StyleProfileSchema>;

export type StyleProfileDraft = {
  archetype: string | null;
  palette: string | null;
  fit: string | null;
  dress_codes: string[];
  occasions: string[];
  nogos: NoGo[];
};

const known = (id: QuestionId, raw: unknown): string[] => {
  const allowed = new Set(valuesOf(id));
  return Array.isArray(raw) ? unique(raw.filter((v): v is string => typeof v === "string" && allowed.has(v))) : [];
};
const single = (id: QuestionId, raw: unknown): string | null => known(id, [raw])[0] ?? null;

export function readNogos(raw: unknown): NoGo[] {
  const allowed = new Set<string>(NOGO_VALUES);
  return Array.isArray(raw) ? unique(raw.filter((v): v is NoGo => typeof v === "string" && allowed.has(v))) : [];
}

export function readStyleProfile(row: Record<string, unknown> | null | undefined): StyleProfileDraft {
  return {
    archetype: single("archetype", row?.archetype),
    palette: single("palette", row?.palette),
    fit: single("fit", row?.fit),
    dress_codes: known("dress_codes", row?.dress_codes),
    occasions: known("occasions", row?.occasions),
    nogos: readNogos(row?.nogos),
  };
}

/** Dress code → formality 1..5; the generator's personal band is the span of the chosen codes. */
const RANK: Record<string, number> = { Loungewear: 1, Casual: 2, "Smart casual": 3, Business: 4, "Black tie": 5 };

export function formalityRange(dressCodes: readonly string[]): { formality_min: number; formality_max: number } {
  const ranks = dressCodes.map((c) => RANK[c] ?? 3);
  return { formality_min: Math.min(...ranks), formality_max: Math.max(...ranks) };
}

export type LookInputs = {
  archetype: string | null;
  nogos: readonly string[];
  occasions: readonly string[];
  palette: string | null;
  fit: string | null;
  formality_min: number | null;
  formality_max: number | null;
};

/**
 * Would today's stored looks have been built differently? Only then is the drop cleared (a free rebuild).
 * Band, no-gos, archetype (it reaches the rerank prompt) and OCCASIONS: "Style with this piece" derives its occasion
 * from them (`predictOccasion`) but caches by item and day, so a look built and narrated for Work would otherwise
 * stay Work after the user switches to Evening — and PALETTE and FIT, which steer scoring since quiz part 2.
 */
export function affectsLooks(before: LookInputs, after: LookInputs): boolean {
  const same = (a: readonly string[], b: readonly string[]) => [...a].sort().join("|") === [...b].sort().join("|");
  return (
    before.archetype !== after.archetype ||
    before.formality_min !== after.formality_min ||
    before.formality_max !== after.formality_max ||
    before.palette !== after.palette ||
    before.fit !== after.fit ||
    !same(before.nogos, after.nogos) ||
    !same(before.occasions, after.occasions)
  );
}

/** Quiz/editor answers (every answer a list) → the action payload the schema validates. */
export function toStyleProfileInput(answers: Partial<Record<QuestionId, string[]>>) {
  return {
    archetype: answers.archetype?.[0] ?? "",
    palette: answers.palette?.[0] ?? "",
    fit: answers.fit?.[0] ?? "",
    dress_codes: answers.dress_codes ?? [],
    occasions: answers.occasions ?? [],
    nogos: answers.nogos ?? [],
  };
}
