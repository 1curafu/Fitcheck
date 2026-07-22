import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { forStructuredOutput } from "@/lib/ai/tagging-schema";

// Text-only re-rank (CLAUDE.md Decision 3, mode 2): the model sees tag DESCRIPTIONS,
// never images. It returns the best 3 with a look name + one-sentence "why".

export type DescItem = { category: string; subcategory?: string | null; colors: string[] };

export function describeCombos(combos: DescItem[][]): string {
  return combos
    .map(
      (c, i) =>
        `${i}. ` +
        c.map((it) => `${it.subcategory ?? it.category} (${it.colors.join("/")})`).join(" + "),
    )
    .join("\n");
}

/**
 * Display budget for a look name — comfortably fits the "≤4 words" the prompt
 * asks for ("The Impeccable Charcoal Layer" = 29) with room to spare.
 */
export const NAME_MAX = 40;

/**
 * Clamp a name to NAME_MAX on a word boundary.
 *
 * A name is decoration; the "why" is the product. This is a `transform`, not a
 * `.max()`, on purpose: the cap is never enforced on the model — CLAUDE.md's
 * `forStructuredOutput` strips `maxLength` because the API 400s on it — so a
 * hard bound here existed only as a post-hoc throw that failed the ENTIRE
 * generation and surfaced as "Couldn't reach the stylist". Repair, don't reject.
 */
export function clampName(raw: string): string {
  const s = raw.trim();
  if (s.length <= NAME_MAX) return s;
  const cut = s.slice(0, NAME_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

// The WIRE shape — what we ask the model for. Kept transform-free because
// `z.toJSONSchema` cannot represent a transform ("Transforms cannot be
// represented in JSON Schema"); the repair belongs on the way in, not the way out.
const PickShape = z.object({
  combo_index: z.number().int(),
  name: z.string().min(1),
  why: z.string().min(1),
});

// Sanitised JSON Schema for Anthropic's output_config.format (strips min/max keywords
// that would 400 — real bounds re-enforced by RerankSchema.parse after the call).
export const rerankJsonSchema = forStructuredOutput(
  z.toJSONSchema(z.object({ picks: z.array(PickShape).length(3) })),
) as Record<string, unknown>;

// The PARSE shape — same fields, plus the name repair.
export const RerankSchema = z.object({
  picks: z.array(PickShape.extend({ name: z.string().min(1).transform(clampName) })).length(3),
});
export type RerankResult = z.infer<typeof RerankSchema>;

export async function rerank(args: {
  combos: DescItem[][];
  aesthetic: string[];
  occasion: string;
  weatherLabel: string;
  tempC: number;
}): Promise<RerankResult> {
  const prompt = `You are a personal stylist. The user's aesthetic is ${
    args.aesthetic.join(", ") || "understated, modern menswear"
  }. Occasion: ${args.occasion}. Weather: ${args.weatherLabel}, ${args.tempC}°C.
Here are candidate outfits (already filtered and scored), one per line:
${describeCombos(args.combos)}

Pick the best 3. For each return: its combo_index; a short evocative NAME (≤4 words and at most ${NAME_MAX} characters, e.g. "The Off-Duty Camel"); and ONE warm, specific sentence ("why") that references the colours/pieces (e.g. "the camel knit warms the grey trousers and picks up the loafers"). Return exactly 3 picks.`;

  const client = new Anthropic(); // lazy: keeps this module importable in tests without a key
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 700,
    output_config: { format: { type: "json_schema", schema: rerankJsonSchema } },
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return RerankSchema.parse(JSON.parse(text));
}
