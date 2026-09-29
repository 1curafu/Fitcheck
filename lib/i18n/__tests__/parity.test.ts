import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import enUS from "@/messages/en-US.json";
import enGB from "@/messages/en-GB.json";
import uk from "@/messages/uk.json";
import de from "@/messages/de.json";
import ru from "@/messages/ru.json";
import fr from "@/messages/fr.json";
import it_ from "@/messages/it.json";
import pt from "@/messages/pt.json";
import es from "@/messages/es.json";
import nl from "@/messages/nl.json";
import type { Locale } from "../locales";
import { CONTENT_LOCALES } from "./content-locales";

type Tree = { [k: string]: string | Tree };
type Full = Exclude<Locale, "en-US" | "en-GB">;
const leaves = (t: Tree, p = ""): [string, string][] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [[`${p}${k}`, v]] : leaves(v, `${p}${k}.`)));
const args = (m: string) => {
  const out = new Set<string>();
  const walk = (els: MessageFormatElement[]) => els.forEach((e) => {
    if ("value" in e && e.type !== TYPE.literal) out.add(String(e.value));
    if ("options" in e) Object.values(e.options).forEach((o) => walk(o.value));
  });
  walk(parse(m));
  return [...out].sort();
};
const plurals = (m: string) => {
  const found: string[][] = [];
  const walk = (els: MessageFormatElement[]) => els.forEach((e) => {
    if (e.type === TYPE.plural) found.push(Object.keys(e.options).sort());
    if ("options" in e) Object.values(e.options).forEach((o) => walk(o.value));
  });
  walk(parse(m));
  return found;
};

/** Full catalogues. Each Plan 3 locale task adds its import and entry. */
const CATALOGUES: Partial<Record<Full, Tree>> = { uk: uk as Tree, de: de as Tree, ru: ru as Tree, fr: fr as Tree, it: it_ as Tree, pt: pt as Tree, es: es as Tree, nl: nl as Tree };
/** Brand words that stay English in every language. */
const ALWAYS_ENGLISH = new Set(["common.brand", "landing.wordmark", "share.cardFooter", "billing.pro", "billing.proBrand", "billing.proPlan"]);
/** Reviewed keys whose correct translation equals English (for example "Look" in German). Each must still equal English. */
const SAME_AS_ENGLISH: Partial<Record<Full, string[]>> = {
  de: ["shell.nav.stylist", "item.edit.name", "item.edit.material", "item.edit.branding", "capture.confirm.name", "capture.confirm.material",
    "vocab.material.Tweed", "vocab.material.Fleece", "vocab.material.Polyester", "vocab.material.Nylon", "vocab.material.Modal",
    "vocab.material.Lyocell", "vocab.material.Gold", "vocab.texture.Seersucker", "vocab.color.beige", "vocab.color.taupe",
    "vocab.color.khaki", "vocab.color.camel", "vocab.color.indigo", "vocab.color.gold", "vocab.color.orange", "vocab.length.Midi",
    "vocab.season.Winter", "generate.refine.palette.neutral", "generate.refine.palette.camel", "share.format", "share.story",
    "share.post", "packing.outfits"],
  fr: ["onboarding.questions.nogos.options.shorts.label", "item.edit.texture", "capture.confirm.texture", "vocab.material.Tweed",
    "vocab.material.Polyester", "vocab.material.Nylon", "vocab.material.Viscose", "vocab.material.Modal", "vocab.material.Lyocell",
    "vocab.texture.Seersucker", "vocab.color.beige", "vocab.color.taupe", "vocab.color.camel", "vocab.color.caramel",
    "vocab.color.indigo", "vocab.color.olive", "vocab.color.orange", "vocab.length.Midi", "generate.refine.palette.camel",
    "generate.refine.palette.olive", "share.format", "share.story", "packing.destination"],
  it: ["shell.nav.stylist", "vocab.occasion.weekend", "onboarding.questions.occasions.options.Weekend.label", "vocab.material.Tweed", "vocab.material.Nylon", "vocab.material.Modal", "vocab.material.Lyocell",
    "vocab.texture.Twill", "vocab.texture.Seersucker", "vocab.color.beige", "vocab.color.terracotta", "vocab.length.Midi",
    "share.post", "billing.privacy"],
  pt: ["item.edit.material", "capture.confirm.material", "vocab.material.Tweed", "vocab.material.Nylon", "vocab.material.Viscose",
    "vocab.material.Modal", "vocab.texture.Seersucker", "vocab.color.chocolate", "vocab.color.coral", "vocab.length.Midi",
    "vocab.formality.5", "share.story"],
  es: ["item.edit.material", "capture.confirm.material", "vocab.material.Tweed", "vocab.material.Modal", "vocab.material.Lyocell",
    "vocab.texture.Seersucker", "vocab.color.camel", "vocab.color.chocolate", "vocab.color.coral", "vocab.length.Midi",
    "vocab.formality.5", "generate.refine.palette.camel"],
  nl: ["shell.nav.stylist", "onboarding.questions.occasions.options.Weekend.label", "onboarding.questions.nogos.options.skinny.label",
    "vocab.occasion.weekend", "vocab.material.Canvas", "vocab.material.Tweed", "vocab.material.Fleece", "vocab.material.Polyester",
    "vocab.material.Nylon", "vocab.material.Viscose", "vocab.material.Modal", "vocab.material.Lyocell", "vocab.material.Rubber",
    "vocab.texture.Seersucker", "vocab.color.beige", "vocab.color.taupe", "vocab.color.camel", "vocab.color.indigo",
    "vocab.color.terracotta", "vocab.length.Midi", "vocab.season.Winter", "vocab.pattern.print", "generate.refine.palette.camel",
    "share.story", "share.post", "billing.privacy", "packing.outfits"],
};
/** Another region's vocabulary a catalogue must not use. */
const FORBIDDEN: Partial<Record<Full, RegExp>> = {
  pt: /(^|[^\p{L}])(celular|tela|usuári\p{L}*|compartilh\p{L}*|arquivo)(?!\p{L})/iu,
};
/** CLDR "many" in these languages covers only compact/exponent numbers, which Fitcheck never formats. */
const COMPACT_ONLY_MANY = new Set<Locale>(["fr", "it", "pt", "es"]);
const requiredPlurals = (l: Locale) => new Intl.PluralRules(l).resolvedOptions().pluralCategories
  .filter(c => !(c === "many" && COMPACT_ONLY_MANY.has(l))).slice().sort();

const us = new Map(leaves(enUS as Tree));

it("every content locale other than the English variants has a full catalogue", () => {
  for (const l of CONTENT_LOCALES) if (l !== "en-US" && l !== "en-GB") expect(CATALOGUES[l as Full], l).toBeDefined();
});
it("British English overrides only keys that exist, with the same placeholders", () => {
  for (const [k, v] of leaves(enGB as Tree)) {
    expect(us.has(k), k).toBe(true);
    expect(args(v), k).toEqual(args(us.get(k)!));
  }
});

describe.each(Object.entries(CATALOGUES) as [Full, Tree][])("%s catalogue", (locale, messages) => {
  const entries = leaves(messages);
  const own = new Map(entries);
  it("has exactly the en-US keys", () => expect([...own.keys()].sort()).toEqual([...us.keys()].sort()));
  it("keeps every placeholder", () => { for (const [k, v] of entries) expect(args(v), k).toEqual(args(us.get(k)!)); });
  it("covers every plural category the language needs", () => {
    for (const [k, v] of entries) for (const opts of plurals(v)) for (const c of requiredPlurals(locale)) expect(opts, `${k} lacks ${c}`).toContain(c);
  });
  it("leaves nothing in English except brands and reviewed loanwords", () => {
    const allowed = new Set([...ALWAYS_ENGLISH, ...(SAME_AS_ENGLISH[locale] ?? [])]);
    expect(entries.filter(([k, v]) => v === us.get(k) && /\p{L}{4,}/u.test(v) && !allowed.has(k)).map(([k]) => k)).toEqual([]);
    for (const k of SAME_AS_ENGLISH[locale] ?? []) expect(own.get(k), `${k} is no longer English; drop it from the allowlist`).toBe(us.get(k));
  });
  it("avoids another region's vocabulary", () => {
    const rule = FORBIDDEN[locale];
    if (rule) expect(entries.filter(([, v]) => rule.test(v)).map(([k]) => k)).toEqual([]);
  });
  it("keeps bottom navigation labels short enough for the 440px bar", () => {
    for (const k of ["closet", "stylist", "diary", "profile"]) expect(own.get(`shell.nav.${k}`)!.length, k).toBeLessThanOrEqual(12);
  });
});

it("Russian counts use the right plural form", async () => {
  const { createTranslator } = await import("next-intl");
  const t = createTranslator({ locale: "ru", messages: ru as never });
  expect([1, 2, 5, 11, 21, 22, 25].map(n => t("stats.slot.other" as never, { n } as never)))
    .toEqual(["1 вещь", "2 вещи", "5 вещей", "11 вещей", "21 вещь", "22 вещи", "25 вещей"]);
});
