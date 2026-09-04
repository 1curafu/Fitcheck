"use server";

import Anthropic from "@anthropic-ai/sdk";
import { taggingJsonSchema } from "./tagging-schema";
import { parseTagText } from "./parse-tags";
import { PROMPT } from "./tagging-prompt";

// Constructed lazily inside tagItem(), not at module scope: a module-level
// `new Anthropic()` runs as a side effect of merely importing this file. Also
// matches the established pattern in this codebase — lib/generator/rerank.ts
// constructs its client inside the function too ("lazy: keeps this module
// importable in tests without a key").
function getClient() {
  return new Anthropic(); // reads ANTHROPIC_API_KEY (server-only)
}

export async function tagItem(
  cutoutBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
) {
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
  return parseTagText(text); // validated Tags (a draft shown on the confirm screen)
}
