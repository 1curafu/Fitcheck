import { readdirSync, readFileSync } from "node:fs";
import { LOCALES } from "../locales";

const dir = "supabase/migrations";
const files = readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
const latest = (needle: string) => [...files].reverse().map(f => readFileSync(`${dir}/${f}`, "utf8")).find(sql => sql.includes(needle))!;
const lists = (sql: string) => [...sql.matchAll(/p_locale not in \(([^)]*)\)/g)].map(m => m[1].split(",").map(s => s.trim().replace(/'/g, "")).sort());

/** A routed locale the SQL guard refuses would silently never translate: the fallback shows the original, no error. */
it.each(["function public.claim_outfit_text_translations", "function public.finish_outfit_text_translations"])(
  "the newest %s accepts exactly the app's locales", (needle) => {
    const sql = latest(needle);
    const own = sql.slice(sql.indexOf(needle), sql.indexOf("$$;", sql.indexOf(needle)));
    expect(lists(own)).toEqual([[...LOCALES].sort()]);
  });
it("stored text and cache locales match the app's locales", () => {
  const all = files.map(f => readFileSync(`${dir}/${f}`, "utf8")).join("\n");
  const found = [...all.matchAll(/(?:text_locale|target_locale|source_locale) in \(([^)]*)\)/g)];
  expect(found.length).toBeGreaterThan(0);
  for (const m of found) expect(m[1].split(",").map(s => s.trim().replace(/'/g, "")).sort()).toEqual([...LOCALES].sort());
});
