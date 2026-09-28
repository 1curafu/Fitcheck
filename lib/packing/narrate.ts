import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { forStructuredOutput } from "@/lib/ai/tagging-schema";
import { describeCombos, clampName, NAME_MAX, type DescItem } from "@/lib/generator/rerank";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { outputLanguage } from "@/lib/ai/output-locale";

/**
 * Naming and the "why" for a whole trip, in ONE call.
 *
 * ⚠️ **Why not `rerank`:** it is capped at `MAX_PICKS = 3`, which is right for
 * the daily drop (the tabs are 01/02/03 and a fourth does not fit at 390px) and
 * wrong for a seven-day trip. This asks for one line per day plus one for the
 * capsule as a whole.
 *
 * ⚠️ **One batched call, not one per day** (spec decision #6). Seven calls would
 * be seven times the cost and seven chances to fail, for a feature whose whole
 * economic argument is that a trip is episodic.
 *
 * ⚠️ **The model NEVER chooses anything.** The capsule and the day assignments
 * are already decided, deterministically, by `solveCapsule`. Its only job is
 * language — the same division as everywhere else in this product.
 */
export const TripNarrationSchema = z.object({
  capsule_why: z.string(),
  days: z.array(z.object({ name: z.string(), why: z.string() })),
});
export type TripNarration = z.infer<typeof TripNarrationSchema>;

export const tripNarrationJsonSchema = forStructuredOutput(
  z.toJSONSchema(TripNarrationSchema, { io: "output" }),
) as Record<string, unknown>;

export type NarrateArgs = {
  /** One entry per day, in date order. */
  days: { occasion: string; tempC: number; rain: boolean; pieces: DescItem[] }[];
  capsule: DescItem[];
  aesthetic: string[];
  destination: string;
  /** True when part of the trip is past the forecast horizon. */
  beyondHorizon: boolean;
  locale?: Locale;
};

export function fallbackTripLookName(dayIndex: number, locale: Locale): string {
  const labels: Record<Locale, string> = { "en-US": "Day", "en-GB": "Day", uk: "День", ru: "День", de: "Tag",
    fr: "Jour", it: "Giorno", pt: "Dia", es: "Día", nl: "Dag" };
  return `${labels[locale]} ${dayIndex + 1}`;
}

/** Deterministic filler so CI spends nothing and the shipped path is the tested one. */
function stubbed(args: NarrateArgs): TripNarration {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (locale === "uk") return {
    capsule_why: `Компактна капсула для ${args.destination}, речі якої легко поєднувати.`,
    days: args.days.map((day, index) => ({ name: fallbackTripLookName(index, locale),
      why: `Обрано для ${day.tempC}°C${day.rain ? " і дощу" : ""}; речі поєднуються між собою.` })),
  };
  return {
    capsule_why: `A tight capsule for ${args.destination}, built to recombine.`,
    days: args.days.map((d, i) => ({
      name: fallbackTripLookName(i, locale),
      why: `Chosen for ${d.occasion} at ${d.tempC}°C.`,
    })),
  };
}

export function buildTripNarrationPrompt(args: NarrateArgs): string {
  const dayLines = args.days
    .map((d, i) => `Day ${i + 1} (${d.occasion}, ${d.tempC}°C${d.rain ? ", rain" : ""}): ${describeCombos([d.pieces])}`)
    .join("\n");

  return `You are a personal stylist writing about a packing capsule for ${args.destination}.
The user's aesthetic is ${args.aesthetic.join(", ") || "understated, modern menswear"}.

These pieces are going in the case:
${describeCombos([args.capsule])}

They are worn like this, in order:
${dayLines}

Pieces repeat across days on purpose — that is what makes the capsule small, and it is worth saying so rather than hiding it.${
    args.beyondHorizon
      ? " Part of this trip is beyond the forecast, so do not speak about the weather with certainty."
      : ""
  }

Return:
- "capsule_why": ONE warm, specific sentence about why these pieces work together as a set — reference actual colours and fabrics listed above. This is the line that sells the capsule.
- "days": exactly ${args.days.length} entries in the SAME ORDER, each with a short evocative NAME (≤4 words, at most ${NAME_MAX} characters) and ONE sentence "why" referencing that day's pieces and occasion.

Only claim a fabric or weave actually listed for a piece.
Write capsule_why and every day name/why in ${outputLanguage(args.locale ?? DEFAULT_LOCALE)}. Keep piece descriptors and brand names unchanged.`;
}

export async function narrateTrip(args: NarrateArgs): Promise<TripNarration> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  // Checked before the client is constructed, so CI needs no ANTHROPIC_API_KEY.
  if (process.env.FITCHECK_STUB_AI === "1") return finalise(stubbed(args), args.days.length, locale);

  const client = new Anthropic(); // lazy: keeps this module importable in tests without a key
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1400,
    output_config: { format: { type: "json_schema", schema: tripNarrationJsonSchema } },
    messages: [{ role: "user", content: buildTripNarrationPrompt(args) }],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return finalise(TripNarrationSchema.parse(JSON.parse(text)), args.days.length, locale);
}

/**
 * Guarantee one entry per day.
 *
 * ⚠️ The prompt asks for exactly N; this makes it true. A model returning six
 * lines for a seven-day trip must cost the user one sentence, never a day that
 * renders blank — the days come from the solve, not from the model.
 */
export function finalise(raw: TripNarration, wantDays: number, locale: Locale = DEFAULT_LOCALE): TripNarration {
  const days = Array.from({ length: wantDays }, (_, i) => ({
    name: clampName(raw.days[i]?.name ?? fallbackTripLookName(i, locale)),
    why: raw.days[i]?.why ?? "",
  }));
  return { capsule_why: raw.capsule_why ?? "", days };
}
