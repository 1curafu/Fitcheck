"use server";

import Anthropic from "@anthropic-ai/sdk";
import { taggingJsonSchema } from "./tagging-schema";
import { parseTaggingResponse } from "./parse-tags";
import { PROMPT } from "./tagging-prompt";

// Constructed lazily inside tagItem(), not at module scope: a module-level
// `new Anthropic()` runs as a side effect of merely importing this file. Also
// matches the established pattern in this codebase — lib/generator/rerank.ts
// constructs its client inside the function too ("lazy: keeps this module
// importable in tests without a key").
function getClient() {
  return new Anthropic(); // reads ANTHROPIC_API_KEY (server-only)
}

/**
 * A deterministic draft, used only when `FITCHECK_STUB_AI=1` — set for the
 * Playwright run and nowhere else. Same seam as `stubbedRerank`: the stub sits
 * INSIDE the shipped function, so the e2e capture drives the real client
 * pipeline (compression, our own background removal, encoding, upload) and
 * only the paid call is replaced. Checked before the client is constructed, so
 * the run needs no ANTHROPIC_API_KEY. Not exported: this is a "use server"
 * module, where every export must be an async Server Action.
 */
function stubbedTags() {
  return parseTaggingResponse(
    JSON.stringify({
      category: "Tops", subcategory: "Oxford shirt", colors: ["white"], pattern: "solid",
      material: "Cotton", texture: "Flat", formality: 3, seasons: ["Spring", "Autumn"],
      accent_color: null, branding: "None", fit: "Regular", length: "Hip", bulk: null, distressing: "None",
      rotation: 0,
    }),
  );
}

export async function tagItem(
  cutoutBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
) {
  if (process.env.FITCHECK_STUB_AI === "1") return stubbedTags();
  const res = await getClient().messages.create({
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
  return parseTaggingResponse(text); // validated draft tags + rotation, for the confirm screen
}
