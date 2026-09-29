import { expect, it } from "vitest";
import { createTranslator } from "next-intl";
import enUS from "@/messages/en-US.json";
import { CATEGORIES, SEASONS } from "@/lib/closet/vocab";
import { MATERIALS, TEXTURES, COLOR_NAMES, BRANDING, FITS, LENGTHS, BULKS, DISTRESSING, TagSchema } from "@/lib/ai/tagging-schema";

const LISTS = {
  category: CATEGORIES, season: SEASONS, material: MATERIALS, texture: TEXTURES, color: COLOR_NAMES,
  pattern: TagSchema.shape.pattern.options, fit: FITS, length: LENGTHS, bulk: BULKS, distressing: DISTRESSING,
  branding: BRANDING, occasion: ["everyday", "work", "weekend", "evening"], formality: ["1", "2", "3", "4", "5"],
} as const;

it("labels every stored vocabulary value in en-US", () => {
  for (const [kind, values] of Object.entries(LISTS)) {
    const labels = (enUS.vocab as Record<string, Record<string, string>>)[kind];
    for (const value of values) expect(labels?.[value], `${kind}.${value}`).toBeTruthy();
  }
});

it("stored values contain no key separator", () => {
  for (const values of Object.values(LISTS)) for (const value of values) expect(value).not.toContain(".");
});

it("display labels preserve unknown historical values", async () => {
  const { vocabLabel } = await import("../vocab-server");
  const t = createTranslator({ locale: "en-US", messages: enUS, namespace: "vocab" });
  expect(vocabLabel(t, "category", "Tops")).toBe("Tops");
  expect(vocabLabel(t, "category", "Historical category")).toBe("Historical category");
});
