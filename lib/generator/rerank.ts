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

export const RerankSchema = z.object({
  picks: z
    .array(
      z.object({
        combo_index: z.number().int(),
        name: z.string().min(1).max(24),
        why: z.string().min(1),
      }),
    )
    .length(3),
});
export type RerankResult = z.infer<typeof RerankSchema>;

// Sanitised JSON Schema for Anthropic's output_config.format (strips min/max keywords
// that would 400 — real bounds re-enforced by RerankSchema.parse after the call).
export const rerankJsonSchema = forStructuredOutput(z.toJSONSchema(RerankSchema)) as Record<
  string,
  unknown
>;

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

Pick the best 3. For each return: its combo_index; a short evocative NAME (≤4 words, e.g. "The Off-Duty Camel"); and ONE warm, specific sentence ("why") that references the colours/pieces (e.g. "the camel knit warms the grey trousers and picks up the loafers"). Return exactly 3 picks.`;

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
