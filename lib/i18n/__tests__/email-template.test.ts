import { readFileSync } from "node:fs";
import { CONTENT_LOCALES } from "./content-locales";

const html = readFileSync("supabase/templates/magic-link.html", "utf8");
const chains = [...html.matchAll(/\{\{ if eq \.Data\.locale "[^"]+" \}\}[\s\S]*?\{\{ end \}\}/g)].map(m => m[0]);
const branches = (chain: string) => [...chain.matchAll(/eq \.Data\.locale "([^"]+)"/g)].map(m => m[1]).sort();
const expected = CONTENT_LOCALES.filter(l => l !== "en-US").slice().sort();

it("has one chain per localized fragment", () => expect(chains).toHaveLength(11));
it.each(chains.map((c, i) => [i, c] as const))("chain %i branches for every content locale and falls back to en-US", (_, chain) => {
  expect(branches(chain)).toEqual(expected);
  expect(chain).toContain("{{ else }}");
});
it("html lang names each branch's own language", () => {
  for (const l of expected) expect(chains[0]).toContain(`eq .Data.locale "${l}" }}${l}{{`);
});
