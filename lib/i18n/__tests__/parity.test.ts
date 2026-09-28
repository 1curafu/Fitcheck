import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { expect, it } from "vitest";
import enUS from "@/messages/en-US.json";
import enGB from "@/messages/en-GB.json";
import uk from "@/messages/uk.json";

type Tree = { [k: string]: string | Tree };
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

const us = new Map(leaves(enUS as Tree));

it("Ukrainian has exactly the en-US keys", () => {
  expect([...new Map(leaves(uk as Tree)).keys()].sort()).toEqual([...us.keys()].sort());
});
it("British English overrides only keys that exist", () => {
  for (const [k] of leaves(enGB as Tree)) expect(us.has(k), k).toBe(true);
});
it.each([["uk", uk], ["en-GB", enGB]] as const)("%s keeps every placeholder", (_, messages) => {
  for (const [k, v] of leaves(messages as Tree)) expect(args(v), k).toEqual(args(us.get(k)!));
});
it("every Ukrainian plural has one, few, many and other", () => {
  const needed = new Intl.PluralRules("uk").resolvedOptions().pluralCategories.slice().sort();
  for (const [k, v] of leaves(uk as Tree)) for (const opts of plurals(v)) {
    for (const c of needed) expect(opts, `${k} lacks ${c}`).toContain(c);
  }
});
it("no Ukrainian string is left in English", () => {
  const brands = new Set(["common.brand", "landing.wordmark", "share.cardFooter", "billing.pro", "billing.proBrand", "billing.proPlan"]);
  const same = leaves(uk as Tree).filter(([k, v]) => v === us.get(k) && /\p{L}{4,}/u.test(v) && !brands.has(k));
  expect(same).toEqual([]);
});
