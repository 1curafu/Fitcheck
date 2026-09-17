import robots from "../robots";
import sitemap from "../sitemap";
import { PRIVATE_PREFIXES, PUBLIC_PATHS, SITE_URL } from "@/lib/site";
import { readdirSync } from "node:fs";
import { config as proxyConfig } from "../../proxy";

test("every public path is in the sitemap, as an absolute https URL", () => {
  const urls = sitemap().map((e) => e.url);
  for (const p of PUBLIC_PATHS) expect(urls).toContain(`${SITE_URL}${p}`);
  for (const u of urls) expect(u.startsWith("https://")).toBe(true);
});

test("robots points at the sitemap and blocks every signed-in surface", () => {
  const r = robots();
  expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  for (const p of PRIVATE_PREFIXES) expect(rule.disallow).toContain(`${p}/`);
  for (const p of PUBLIC_PATHS) expect(rule.allow).toContain(p);
});

test("every app route is classified public or private — a new route must choose", () => {
  const routes = readdirSync("app", { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && d.name !== "__tests__")
    .map((d) => `/${d.name}`);
  for (const r of routes) {
    const known = PUBLIC_PATHS.includes(r as never) || PRIVATE_PREFIXES.includes(r as never);
    expect(known, `${r} is neither public nor private in lib/site`).toBe(true);
  }
});

test("the session-refresh proxy skips the crawler files", () => {
  const matcher = new RegExp(`^${proxyConfig.matcher[0]}$`);
  expect(matcher.test("/robots.txt")).toBe(false);
  expect(matcher.test("/sitemap.xml")).toBe(false);
  expect(matcher.test("/manifest.webmanifest")).toBe(false);
  expect(matcher.test("/closet")).toBe(true);
});
