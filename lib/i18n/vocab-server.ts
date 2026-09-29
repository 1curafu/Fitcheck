import type { VocabKind } from "./vocab";

type VocabTranslator = { (key: never): string; has(key: never): boolean };

/** Unknown historical values remain readable without producing missing-key errors. */
export function vocabLabel(t: VocabTranslator, kind: VocabKind, value: string): string {
  const key = `${kind}.${value}` as never;
  return t.has(key) ? t(key) : value;
}
