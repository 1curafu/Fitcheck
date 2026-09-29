import { readFileSync } from "node:fs";

/**
 * The reader is addressed without assuming a gender. In Russian and Ukrainian a past-tense verb agrees with its
 * subject, so "ты не думал" / "ти не думав" silently makes every reader male. Reword (for example "могли не прийти
 * тебе в голову") instead of choosing a form.
 */
const PAST_MASC: Record<"ru" | "uk", { you: RegExp; verb: RegExp }> = {
  ru: { you: /(^|[^\p{L}])ты([^\p{L}]|$)/iu, verb: /\p{L}{2,}(ал|ял|ил|ел)(?![\p{L}])/u },
  uk: { you: /(^|[^\p{L}])ти([^\p{L}]|$)/iu, verb: /\p{L}{2,}(ав|яв|ив|ів)(?![\p{L}])/u },
};

function leaves(o: unknown, p = ""): [string, string][] {
  if (typeof o === "string") return [[p.slice(0, -1), o]];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => leaves(v, `${p}${k}.`));
}

for (const [locale, rule] of Object.entries(PAST_MASC)) {
  test(`${locale} landing copy never addresses the reader with a gendered past tense`, () => {
    const home = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).home;
    const offenders = leaves(home).filter(([, v]) =>
      v.split(/(?<=[.!?])\s+/).some((sentence) => rule.you.test(sentence) && rule.verb.test(sentence)));
    expect(offenders.map(([k, v]) => `${k}: ${v}`)).toEqual([]);
  });
}
