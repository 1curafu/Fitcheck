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
material — the main material visible from its texture: e.g. cotton, wool, linen, denim, \
leather, suede, canvas, knit, metal. For shoes/accessories name the dominant material \
(leather, suede, canvas, metal). If uncertain, give the most likely — never leave it blank.
formality — 1 very casual (tees, sneakers, hoodies) up to 5 formal (suits, dress shoes, silk \
ties). 3 is smart-casual: chinos, oxford shirts, loafers, clean minimal sneakers.
seasons — every season the item genuinely suits (wool coat → Autumn, Winter; linen shirt → \
Spring, Summer; a plain cotton tee → all four).

Return ONLY the structured tags.`;

export async function tagItem(
  cutoutBase64: string,
  mediaType: "image/png" | "image/jpeg",
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
