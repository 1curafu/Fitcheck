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

/**
 * The variety instruction.
 *
 * "Pick the best 3" alone produces three versions of one outfit: the model is
 * optimising a single notion of "best", and the candidates handed to it are
 * ranked, so the top of the list is naturally near-identical. Asking for the
 * best 3 without asking for three DIFFERENT ones gets exactly what it asks for.
 */
export const RERANK_VARIETY_RULE =
  "The three must be genuinely different outfits, not variations of one: no two may share the same top, and no two may share the same bottom. If the candidates cannot give you three that differ, prefer variety over a marginally higher-scoring repeat.";

type Pick = { combo_index: number; name: string; why: string };

/**
 * Drop picks that reuse a combo the model already chose.
 *
 * The schema checks the array LENGTH, never that the indices differ, so a model
 * returning [4, 4, 7] rendered the same outfit twice. Repair rather than reject
 * — the same stance as `clampName` above: a duplicated index should cost the
 * user one look, not the whole generation.
 *
 * Returning fewer than three is fine and deliberate: the daily drop already
 * tolerates a variable count (`saveDailyLooks` is delete-then-insert for exactly
 * this reason), and two real looks beat three where two are the same.
 */
export function dedupePicks(picks: Pick[], comboCount?: number): Pick[] {
  const seen = new Set<number>();
  return picks.filter((p) => {
    // An index outside the shortlist used to fall back to the FIRST combo, so
    // two bad indices rendered the same outfit twice — duplicates that survive
    // de-duplication because the indices themselves differ. Drop them instead.
    if (comboCount != null && (p.combo_index < 0 || p.combo_index >= comboCount)) return false;
    if (seen.has(p.combo_index)) return false;
    seen.add(p.combo_index);
    return true;
  });
}

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

Pick the best 3. ${RERANK_VARIETY_RULE}

For each return: its combo_index; a short evocative NAME (≤4 words and at most ${NAME_MAX} characters, e.g. "The Off-Duty Camel"); and ONE warm, specific sentence ("why") that references the colours/pieces (e.g. "the camel knit warms the grey trousers and picks up the loafers"). Return exactly 3 picks, each with a DIFFERENT combo_index.`;

  const client = new Anthropic(); // lazy: keeps this module importable in tests without a key
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 700,
    output_config: { format: { type: "json_schema", schema: rerankJsonSchema } },
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  const parsed = RerankSchema.parse(JSON.parse(text));
  // The prompt asks for distinct picks; this guarantees it. A model that repeats
  // an index costs the user one look, not a duplicated outfit on the screen.
  return { ...parsed, picks: dedupePicks(parsed.picks, args.combos.length) };
}
