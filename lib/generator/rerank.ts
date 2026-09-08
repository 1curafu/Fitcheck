import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { forStructuredOutput } from "@/lib/ai/tagging-schema";
import { echoedAccents, withAccent, type ItemColour } from "./styling/echo";

// Text-only re-rank (CLAUDE.md Decision 3, mode 2): the model sees tag DESCRIPTIONS,
// never images. It returns the best 3 with a look name + one-sentence "why".

export type DescItem = {
  category: string;
  subcategory?: string | null;
  colors: string[];
  /**
   * The signals the deterministic half already scores on. The model saw none of
   * them until 2026-08-15, which had two costs: the pattern-clash term could
   * only ORDER the shortlist while the model picked blind to it and was free to
   * choose the one combo with two loud pieces; and the "why" — the product's
   * differentiator — described fabric it was guessing at from a subcategory
   * name. Text costs nothing here (CLAUDE.md Decision 3: never images), and an
   * accurate sentence is the whole point of the call.
   */
  material?: string | null;
  texture?: string | null;
  pattern?: string | null;
  /**
   * The garment's ONE small contrast colour — a logo, a sole, a buckle.
   *
   * ⚠️ Added 2026-09-03 for exactly the reason the comment above records for
   * `pattern`, one signal later. `scoreCombo` now rewards an accent echoed
   * across two garments, so the swoosh sneaker RISES to the top of the
   * shortlist — and without this field the model could not tell it from a plain
   * white one, was free to pick the plain one, and wrote a "why" that could not
   * mention the single most deliberate thing about the outfit.
   *
   * Rendered by `describeItem` as a subordinate detail, never merged into the
   * colour list: "a white shoe with a sky accent" and "a white and sky shoe"
   * are different garments, and the whole point of the column is that they are.
   */
  accent_color?: string | null;
};

/**
 * Unremarkable values are omitted rather than printed.
 *
 * "solid" on every line is noise that buries the one patterned piece, and
 * "flat" says nothing a reader does not already assume. What is left is
 * exactly what should influence the choice.
 */
function describeItem(it: DescItem): string {
  const notes = [
    it.material?.toLowerCase(),
    it.texture && it.texture !== "Flat" ? it.texture.toLowerCase() : null,
    it.pattern && it.pattern !== "solid" ? it.pattern : null,
    // Last, and explicitly labelled. The dominant colours are "/"-joined; an
    // accent is a comma-separated NOTE, so "white, sky accent" cannot be read
    // as the two-tone "white/sky".
    it.accent_color ? `${it.accent_color.toLowerCase()} accent` : null,
  ].filter(Boolean);
  const detail = [it.colors.join("/"), ...notes].filter(Boolean).join(", ");
  return `${it.subcategory ?? it.category}${detail ? ` (${detail})` : ""}`;
}

/**
 * A garment's colours as the echo model sees them, each tagged with the ROLE it
 * plays on that garment.
 *
 * ⚠️ Delegates to `withAccent` rather than re-implementing `accent ? [...colours,
 * accent] : colours`, because `colourScore` assembles the very same evidence for
 * the SCORE. Two matching copies would agree by coincidence, and a change to
 * either would silently desync this sentence from the ranking that produced it.
 *
 * ⚠️ The roles are read, not flattened away: the echo rule keys off them (a
 * navy swoosh echoes a navy top; navy trousers under a navy top do not), and so
 * does the wording below, which names the direction of the pickup. Re-deriving
 * either from `it.accent_color` at this call site would be the same coincidence
 * in a new place.
 */
function colourEvidence(it: DescItem): ItemColour[] {
  return withAccent(it.colors, it.accent_color);
}

/** "the shirt", "the sneakers" — the same name `describeItem` prints, lowercased. */
function itemName(it: DescItem): string {
  return (it.subcategory ?? it.category).toLowerCase();
}

/** "the sneakers'" not "the sneakers's" — these lines are read by a model that writes prose. */
function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

/** "a and b" / "a, b and c" — prose, not a machine list. */
function joinProse(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The combo's colour echo, stated as a fact — or null when it has none.
 *
 * ⚠️ **Hand the model the conclusion, not the ingredients.** `echoScore` already
 * knows which accent repeats and across how many garments, and it now decides
 * the ranking; asking the model to notice the same repeat from the raw lines
 * failed twice, measured against real calls. Told only that echoes matter, it
 * picked the plain sneaker over the echoing one in 9 of 9 runs; pushed harder,
 * it invented an echo in an outfit that had none. This is the same move
 * `DescItem`'s comment records for `pattern` on 2026-08-15.
 *
 * ⚠️ **Never printed unless it is true of THIS combo.** A fact asserted on a
 * combo with no echo is precisely how the fabrication came back, so the note is
 * derived from `echoedAccents` rather than from anything the caller passes in,
 * and shares that function with the scorer — the sentence and the score cannot
 * disagree.
 */
export function echoNote(combo: DescItem[]): string | null {
  const echoes = echoedAccents(combo.map(colourEvidence));
  if (!echoes.length) return null;

  const clauses = echoes.map((colour) => {
    // Roles come from `colourEvidence`, i.e. from the same assembly the scorer
    // used — `echoedAccents` named this colour because of those roles, so the
    // sentence has to read them from there too.
    const rolesOf = (it: DescItem) => colourEvidence(it).filter((e) => e.colour === colour);
    const carriers = combo.filter((it) => rolesOf(it).length > 0);
    const viaAccent = carriers.filter((it) => rolesOf(it).some((e) => e.role === "accent"));
    const viaBody = carriers.filter((it) => !rolesOf(it).some((e) => e.role === "accent"));
    // Name the direction when exactly one piece carries the colour as an accent
    // and something else wears it properly — that is the styling move, and "the
    // sneaker's sky accent picks up the shirt" says it better than a symmetric
    // "sky repeats across". Otherwise fall back to the symmetric form, which is
    // true of every other shape (two accents, or two garments wearing it).
    if (viaAccent.length === 1 && viaBody.length > 0) {
      return `the ${possessive(itemName(viaAccent[0]))} ${colour} accent picks up the ${joinProse(viaBody.map(itemName))}`;
    }
    return `${colour} repeats across the ${joinProse(carriers.map(itemName))}`;
  });
  return clauses.join("; ");
}

export function describeCombos(combos: DescItem[][]): string {
  return combos
    .map((c, i) => {
      const note = echoNote(c);
      return `${i}. ` + c.map(describeItem).join(" + ") + (note ? ` — ${note}` : "");
    })
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

/** The most looks a daily drop ever shows. */
export const MAX_PICKS = 3;

// The PARSE shape — same fields, plus the name repair.
//
// `.min(1)`, NOT `.length(3)`. The count is never enforced ON the model —
// `forStructuredOutput` strips minItems/maxItems because the API 400s on them —
// so an exact-3 rule existed only as a post-hoc throw, and a closet with fewer
// than three viable combos failed the ENTIRE generation as "Couldn't reach the
// stylist". That is a lie: the stylist answered, with everything the wardrobe
// could give. It bites hardest right after onboarding's "capture your first
// five", which is the magic moment. Repair, don't reject — the same stance as
// `clampName`. An empty array is still an error; there is nothing to show.
export const RerankSchema = z.object({
  picks: z.array(PickShape.extend({ name: z.string().min(1).transform(clampName) })).min(1),
});
export type RerankResult = z.infer<typeof RerankSchema>;

/**
 * The accent instruction.
 *
 * ⚠️ **This is deliberately SHORT, because `echoNote` now does the hard half.**
 * Two earlier drafts asked the model to spot the repeat itself, and both were
 * measured failing against real Haiku calls on 2026-09-03:
 *
 *   draft 1 — "an echo is worth naming in the why": the model chose the plain
 *     sneaker over the echoing one, then wrote "their sky accent echoing the
 *     top" about an outfit whose top was CREAM. It skipped the real echo and
 *     invented a false one.
 *   draft 2 — added "prefer that outfit over an otherwise identical one": the
 *     fabrication stopped, but the preference was NOT honoured — 0 of 9 live
 *     calls picked the echoing combo.
 *
 * So the echo is now computed and printed on the combo line (`echoNote`), and
 * this rule only has to say what an accent is, that the stated echo is worth
 * naming, and — the one half that measurably earned its place — that an echo
 * must never be invented.
 *
 * ⚠️ **Placement is load-bearing and was measured.** Moving this line down
 * beside "Pick the best N" — where the choice is made, which is where you would
 * expect it to work harder — brought the fabricated echo straight back (2 of 3
 * runs claimed a sky accent "echoes the pale cream tone"). Stated up front with
 * the other reading instructions, 6 of 6 runs stayed clean. It describes how to
 * READ a line, so it belongs with the format, not with the decision. Do not
 * "improve" this by moving it without re-running a live sample.
 */
export const RERANK_ACCENT_RULE =
  "A piece may carry a small accent colour, written as \"sky accent\" — a logo, a sole, hardware; it is not one of the garment's main colours. Where an accent genuinely picks up a colour worn elsewhere in the outfit, the line says so after a dash: that echo is a deliberate styling move, worth preferring and worth naming in the \"why\". Never describe an accent as picking up or echoing a colour when the line does not say it does.";

/**
 * The variety instruction.
 *
 * ⚠️ "the main garment", not "the top and the bottom". A one-piece look has
 * NEITHER, so the older wording left the model free to return three outfits
 * built on the same dress — the same hole `diversity.ts` had, and one a grep for
 * category names could not find because the prompt is prose.
 *
 * "Pick the best 3" alone produces three versions of one outfit: the model is
 * optimising a single notion of "best", and the candidates handed to it are
 * ranked, so the top of the list is naturally near-identical. Asking for the
 * best 3 without asking for three DIFFERENT ones gets exactly what it asks for.
 */
export const RERANK_VARIETY_RULE =
  "The three must be genuinely different outfits, not variations of one: no two may share the same main garment — the top, the bottom, or the dress. If the candidates cannot give you three that differ, prefer variety over a marginally higher-scoring repeat.";

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

/**
 * Everything that stands between the model's answer and the screen: drop
 * repeats and out-of-range indices, then cap at MAX_PICKS. The cap lives here
 * rather than in the schema so an over-eager model costs the user nothing.
 */
export function finalisePicks(picks: Pick[], comboCount?: number, want = MAX_PICKS): Pick[] {
  return dedupePicks(picks, comboCount).slice(0, Math.max(1, want));
}

/**
 * The deterministic stand-in for the model, used by the e2e suite.
 *
 * ⚠️ It lives HERE, inside `rerank`, rather than in a test file — the whole
 * deterministic pipeline (candidates → rank → diversify → layout →
 * persistence → render) still runs, and the code path under test stays the
 * code path that ships. A stub mounted from the test would prove the test
 * works, not that the app does.
 *
 * Enabled only by `FITCHECK_STUB_AI=1`, which is set in CI and nowhere else.
 * Returns the first `want` combos in order, so assertions about WHICH looks
 * appear are stable across runs — the real model's names and "why" sentences
 * differ every time and cannot be asserted at all.
 */
export function stubbedRerank(comboCount: number, want: number): RerankResult {
  const picks = Array.from({ length: Math.min(want, comboCount) }, (_, i) => ({
    combo_index: i,
    name: `Test Look ${i + 1}`,
    why: `A deterministic stand-in for look ${i + 1}, used only when FITCHECK_STUB_AI is set.`,
  }));
  return { picks };
}

export async function rerank(args: {
  combos: DescItem[][];
  aesthetic: string[];
  occasion: string;
  weatherLabel: string;
  /**
   * The temperature the candidates were CHOSEN for — the peak of the window
   * this occasion is worn in (`planningTempFor`), not the current reading.
   *
   * Both call sites passed the current temperature until 2026-08-15, so the
   * model was reasoning about a different day from the one the shortlist was
   * built for. That is how a look chose a cable knit and then explained it as
   * "warmth appropriate for the mild weather" — the sentence was true of the
   * temperature it was given and false of the outfit it was describing.
   */
  tempC: number;
  /** What the thermometer says right now, when it differs enough to matter. */
  nowC?: number;
  /**
   * How many looks to return. Defaults to the full daily set; a regenerate on a
   * day where a look has already been WORN asks for fewer, because the worn one
   * is pinned and still counts toward the day's three. "Today's Looks" is a set
   * of three — the index tabs are 01/02/03 and a fourth does not fit at 390px.
   */
  want?: number;
}): Promise<RerankResult> {
  const want = Math.max(1, Math.min(args.want ?? MAX_PICKS, MAX_PICKS));

  // Checked before the client is constructed, so CI needs no ANTHROPIC_API_KEY
  // and spends nothing. See `stubbedRerank`.
  if (process.env.FITCHECK_STUB_AI === "1") {
    return {
      picks: finalisePicks(stubbedRerank(args.combos.length, want).picks, args.combos.length, want),
    };
  }

  // Say the peak out loud when the day still has to climb into it, or the model
  // reasons about the morning and writes a sentence the outfit contradicts.
  const climbing = args.nowC != null && args.tempC - args.nowC >= 3;
  const weather = climbing
    ? `${args.weatherLabel}, ${args.nowC}°C now, rising to ${args.tempC}°C — these outfits are chosen for the warmest part of the day, so describe them for that, not for the current chill`
    : `${args.weatherLabel}, ${args.tempC}°C`;
  const prompt = `You are a personal stylist. The user's aesthetic is ${
    args.aesthetic.join(", ") || "understated, modern menswear"
  }. Occasion: ${args.occasion}. Weather: ${weather}.
Each piece is listed as: name (colours, fabric, weave, pattern, accent) — fabric and weave are given where known, and a pattern is named only when the piece is not plain. Prefer outfits whose fabrics suit the temperature above, and avoid putting two patterned pieces together.
${RERANK_ACCENT_RULE}
Here are candidate outfits (already filtered and scored), one per line:
${describeCombos(args.combos)}

Pick the best ${want}. ${RERANK_VARIETY_RULE}

For each return: its combo_index; a short evocative NAME (≤4 words and at most ${NAME_MAX} characters, e.g. "The Off-Duty Camel"); and ONE warm, specific sentence ("why") that references the colours/pieces (e.g. "the camel knit warms the grey trousers and picks up the loafers"). Only claim a fabric or weave that is actually listed for that piece. Return exactly ${want} pick${want === 1 ? "" : "s"}, each with a DIFFERENT combo_index.`;

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
  return { ...parsed, picks: finalisePicks(parsed.picks, args.combos.length, want) };
}
