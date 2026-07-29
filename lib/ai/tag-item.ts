"use server";

import Anthropic from "@anthropic-ai/sdk";
import { taggingJsonSchema } from "./tagging-schema";
import { parseTagText } from "./parse-tags";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY (server-only)

const PROMPT = `You are an expert menswear cataloguer. Tag the SINGLE item in the photo — a \
garment, a pair of shoes, or an accessory. Its background may be removed. Judge only from what \
is visible and fill every field.

category — the family it belongs to:
  · Tops: shirts, tees, polos, knits, sweaters, hoodies
  · Bottoms: trousers, chinos, jeans, shorts, skirts
  · Outerwear: coats, overcoats, blazers, jackets
  · Shoes: all footwear
  · Accessories: belts, bags, hats, scarves, ties, watches, jewellery, sunglasses
subcategory — the specific type, in menswear vocabulary (e.g. "Oxford shirt", "Chinos", \
"Penny loafers", "Chelsea boots", "Leather belt", "Field watch"). Be precise.
colors — the 1-3 dominant colours, most-dominant first, common names (navy, charcoal, cream, \
tan, olive, burgundy). Ignore small logos and hardware.
pattern — one of: solid, striped, check, print, other.
material — the main material, from this list ONLY: Cotton, Wool, Merino wool, Cashmere, Linen, \
Silk, Denim, Leather, Suede, Faux leather, Canvas, Corduroy, Tweed, Fleece, Shearling, Down, \
Polyester, Acrylic, Nylon, Viscose, Modal, Lyocell, Stainless steel, Gold, Silver, Rubber, Other. \
For a blend, name the DOMINANT fibre. Pick the closest; use Other only if none fit.
texture — how the fabric is BUILT, from this list ONLY: Flat, Ribbed, Cable knit, Waffle, \
Chunky knit, Fine knit, Brushed, Fleece-back, Twill, Herringbone, Quilted, Pile, Open knit, Terry, \
Seersucker, Other. This is separate from material: a ribbed merino knit and a flat merino shirt \
share a material but wear very differently. Use Flat for smooth woven cloth with no visible \
structure, and Other only if none fit.
formality — 1 very casual (tees, sneakers, hoodies) up to 5 formal (suits, dress shoes, silk \
ties). 3 is smart-casual: chinos, oxford shirts, loafers, clean minimal sneakers.
seasons — every season the item genuinely suits (wool coat → Autumn, Winter; linen shirt → \
Spring, Summer; a plain cotton tee → all four).

Return ONLY the structured tags.`;

export async function tagItem(
  cutoutBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
) {
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    output_config: { format: { type: "json_schema", schema: taggingJsonSchema } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: cutoutBase64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "{}";
  return parseTagText(text); // validated Tags (a draft shown on the confirm screen)
}
