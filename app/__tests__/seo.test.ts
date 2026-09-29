import robots from "../robots";
import sitemap from "../sitemap";
import manifest from "../manifest";

test("one installed app keeps its stable root launch and English manifest",()=>{
 expect(manifest()).toMatchObject({name:"Fitcheck",short_name:"Fitcheck",start_url:"/",lang:"en-US",display:"standalone"});
});
import { PRIVATE_PREFIXES, PUBLIC_PATHS, SITE_URL, UNLISTED_PREFIXES } from "@/lib/site";
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
  // Pages live under the `[locale]` root segment; handlers (`api`, `auth`, `billing`) stay at `app/`.
  const dirs = (root: string) =>
    readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("[") && d.name !== "__tests__")
      .map((d) => `/${d.name}`);
  const routes = [...dirs("app"), ...dirs("app/[locale]")];
  expect(routes).toContain("/closet");
  for (const r of routes) {
    const known = PUBLIC_PATHS.includes(r as never) || PRIVATE_PREFIXES.includes(r as never) || UNLISTED_PREFIXES.includes(r as never);
    expect(known, `${r} is neither public nor private in lib/site`).toBe(true);
  }
});

test("an unlisted share route stays out of the sitemap but is NOT disallowed (previews must fetch it)", () => {
  expect(UNLISTED_PREFIXES).toContain("/l");
  const r = robots();
  const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  expect(rule.disallow).not.toContain("/l/");
  expect(sitemap().some((e) => e.url.includes("/l/"))).toBe(false);
});

test("the session-refresh proxy skips the crawler files", () => {
  const matcher = new RegExp(`^${proxyConfig.matcher[0]}$`);
  expect(matcher.test("/robots.txt")).toBe(false);
  expect(matcher.test("/sitemap.xml")).toBe(false);
  expect(matcher.test("/manifest.webmanifest")).toBe(false);
  expect(matcher.test("/closet")).toBe(true);
});

test("sitemap lists every public page in every locale with its alternates", () => {
  const entries = sitemap();
  expect(entries).toHaveLength(40);
  expect(entries.map(e => e.url)).toEqual(expect.arrayContaining([
    `${SITE_URL}/`, `${SITE_URL}/en-gb`, `${SITE_URL}/uk`, `${SITE_URL}/uk/privacy`, `${SITE_URL}/en-gb/terms`,
    `${SITE_URL}/de`, `${SITE_URL}/pt/privacy`, `${SITE_URL}/nl/terms`,
    `${SITE_URL}/sign-in`, `${SITE_URL}/de/sign-in`, `${SITE_URL}/en-gb/sign-in`,
  ]));
  expect(entries[0].alternates?.languages).toMatchObject({ "en-US": `${SITE_URL}/`, uk: `${SITE_URL}/uk` });
});
test("private routes are disallowed in every locale, shares remain crawlable", () => {
  const r = robots(); const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
  expect(rule.disallow).toEqual(expect.arrayContaining(["/closet/", "/uk/closet/", "/en-gb/settings/", "/de/closet/", "/ru/settings/"]));
  expect(rule.disallow).not.toEqual(expect.arrayContaining(["/l/", "/uk/l/", "/de/l/"]));
});
test("public alternates use canonical locale URLs and an English x-default", async () => {
  const { alternatesFor } = await import("@/lib/i18n/alternates");
  expect(alternatesFor("/privacy", "uk")).toEqual({ canonical: `${SITE_URL}/uk/privacy`, languages: {
    "en-US": `${SITE_URL}/privacy`, "en-GB": `${SITE_URL}/en-gb/privacy`, uk: `${SITE_URL}/uk/privacy`,
    ru: `${SITE_URL}/ru/privacy`, de: `${SITE_URL}/de/privacy`, fr: `${SITE_URL}/fr/privacy`, it: `${SITE_URL}/it/privacy`,
    pt: `${SITE_URL}/pt/privacy`, es: `${SITE_URL}/es/privacy`, nl: `${SITE_URL}/nl/privacy`, "x-default": `${SITE_URL}/privacy`,
  } });
});
