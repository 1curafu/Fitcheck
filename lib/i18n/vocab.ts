"use client";

import { useTranslations } from "next-intl";
import { vocabLabel } from "./vocab-server";

export type VocabKind = "category" | "season" | "material" | "texture" | "color" | "pattern" | "formality" | "fit"
  | "length" | "bulk" | "distressing" | "branding" | "occasion";

/** Translate display only; callers persist the original stored value. */
export function useVocab() {
  const t = useTranslations("vocab");
  return (kind: VocabKind, value: string) => vocabLabel(t, kind, value);
}
