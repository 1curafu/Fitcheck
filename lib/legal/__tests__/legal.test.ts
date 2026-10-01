import { readFileSync } from "node:fs";
import { PRIVACY as PRIVACY_BY_LOCALE } from "../privacy";
import { TERMS as TERMS_BY_LOCALE } from "../terms";
import { OPERATOR } from "../types";

import { CONTENT_LOCALES } from "@/lib/i18n/__tests__/content-locales";
import type { Locale } from "@/lib/i18n/locales";
const PRIVACY = PRIVACY_BY_LOCALE["en-US"];
const TERMS = TERMS_BY_LOCALE["en-US"];

const text = (d: typeof PRIVACY) =>
  [d.intro, ...d.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])])].join("\n");

/**
 * ⚠️ The policy is held to the CODE. Every dependency that handles user data
 * must be named in it, so adding a tracking SDK without updating the policy
 * fails the suite rather than shipping a policy that has quietly become false.
 */
/**
 * ⚠️ Each entry names the dependency AND the sentence the policy must carry for
 * it — not merely the vendor's name. A retroactive mutation sweep found the
 * name-only version too loose twice: "Anthropic" survived being cut from the
 * processors list because the transfers section still said it, and Vercel
 * Analytics survived being undisclosed because Vercel was named as the host.
 */
const PROCESSORS: { pkg: RegExp; name: string; says: RegExp }[] = [
  { pkg: /@supabase\//, name: "Supabase", says: /Supabase \(EU, Frankfurt\) — stores your account/ },
  { pkg: /@anthropic-ai\//, name: "Anthropic", says: /Anthropic \(USA\) — the AI that tags your clothes/ },
  { pkg: /@sentry\//, name: "Sentry", says: /Sentry \(EU\) — receives error reports/ },
  { pkg: /@vercel\/analytics/, name: "Vercel Analytics", says: /counts page views without cookies/ },
  { pkg: /^stripe$|@stripe\//, name: "Stripe", says: /Stripe — handles payment/ },
  { pkg: /posthog|mixpanel|amplitude|segment|hotjar|fullstory|gtag|google-analytics/, name: "", says: /$^/ },
];

const processorsSection = () =>
  PRIVACY.sections.find((s) => s.heading === "Who else sees it")!.bullets!.join("\n");

test("every data-handling dependency in package.json is disclosed, in the processors list, with what it receives", () => {
  const deps = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies ?? {});
  const section = processorsSection();
  for (const dep of deps) {
    for (const { pkg, name, says } of PROCESSORS) {
      if (!pkg.test(dep)) continue;
      // A blank name is a tool the policy has no wording for at all — adding it
      // is a policy decision first, a code change second.
      expect(name, `${dep} needs a privacy-policy decision before it ships`).not.toBe("");
      expect(section, `${dep} is installed but the processors list does not say what ${name} receives`).toMatch(says);
    }
  }
});

test("the services the code calls directly are named too", () => {
  // Not npm packages, so the check above cannot see them.
  const policy = text(PRIVACY);
  for (const name of ["OpenWeather", "Google", "Resend", "Cloudflare"]) expect(policy).toContain(name);
});

test("what the AI receives is stated precisely — photos for tagging, text for reasoning", () => {
  const policy = text(PRIVACY);
  expect(policy).toMatch(/cut-out photo of a garment/);
  expect(policy).toMatch(/never photos/);
});

test("the policy and terms disclose the live account-deletion path and retention ceiling", () => {
  const policy = text(PRIVACY);
  expect(policy).toMatch(/delete your account in Settings/i);
  expect(policy).toContain(OPERATOR.email);
  expect(policy).toMatch(/live data.*immediately/i);
  expect(policy).toMatch(/backups.*30 days/i);
  expect(text(TERMS)).toMatch(/delete your account.*Settings/i);
});

test("both documents name the operator and carry a date", () => {
  for (const d of [PRIVACY, TERMS]) {
    expect(text(d)).toContain(OPERATOR.name);
    expect(d.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the cookie section matches what the app sets: sign-in and language cookies, no consent asked", () => {
  const policy = text(PRIVACY);
  expect(policy).toMatch(/cookies it needs to keep you signed in and remember your language/i);
  expect(policy).toMatch(/notice rather than asked for consent/i);
});

// From the 2026-09-15 legal review (docs/research/fitcheck-privacy-terms-review.md).
test("#3 — the policy admits the original photo may show the wearer, because it is stored", () => {
  // `app/closet/upload/actions.ts` uploads `original.jpg` next to the cutout.
  expect(text(PRIVACY)).toMatch(/shows you wearing the item, we store that photo/);
  expect(text(PRIVACY)).toMatch(/never sent to the AI/);
});

test("#4 — every US-side processor is named in the transfers section", () => {
  const transfers = PRIVACY.sections.find((s) => s.heading === "Data leaving Europe")!.paragraphs.join(" ");
  for (const name of ["Anthropic", "Resend", "Google", "Stripe"]) expect(transfers).toContain(name);
});

test("#2 — the withdrawal waiver describes a checkout confirmation, not a ToS assertion", () => {
  // Art. 16(m) CRD: the waiver needs an affirmative act at purchase. The
  // checkbox itself ships with Stripe (L3); the text must not claim it early.
  const t = text(TERMS);
  expect(t).toMatch(/expressly confirm at checkout/);
  expect(t).toMatch(/Without that confirmation, your 14-day right is unaffected/);
});

test("#6 — paying subscribers get to confirm materially adverse changes", () => {
  expect(text(TERMS)).toMatch(/paying Pro subscriber.*actively confirm/);
});

// Billing (spec §10): Stripe's disclosure rules want the seller's address before payment, and Link — not Fitcheck —
// is the merchant of record under Managed Payments. The old "no checkout exists" text must be gone once it does.
test("the Terms name the seller's address and Link as merchant of record", () => {
  const terms = text(TERMS);
  expect(OPERATOR.address).toBe("Rapperswilerstrasse 1, 8733 Eschenbach SG, Switzerland");
  expect(terms).toContain(OPERATOR.address);
  expect(terms).toMatch(/sold through Link/i);
  expect(terms).toMatch(/CHF 5 a month or CHF 50 a year/);
  expect(terms).toMatch(/end of the period you have paid for/);
  expect(terms).not.toContain("There is no live paid subscription");
});

test("the Privacy policy names Link and what billing data Fitcheck keeps", () => {
  const privacy = text(PRIVACY);
  expect(privacy).toMatch(/Link \(Stripe\) — sells Fitcheck Pro/);
  expect(privacy).toMatch(/Stripe customer ID, your subscription's status and renewal date/);
  expect(privacy).not.toMatch(/once subscriptions exist/);
});

test("E — the policy explains what sharing a look makes public, and for how long", () => {
  const text = JSON.stringify(PRIVACY);
  expect(text).toMatch(/sharing a look/i);
  expect(text).toMatch(/anyone with the link/i);
  expect(text).toMatch(/no name/i);
  expect(text).toMatch(/30 days/i);
  expect(text).toMatch(/stop sharing/i);
  expect(text).toMatch(/not indexed/i);
  expect(text).toMatch(/a copy we cannot delete/i);
  expect(text).not.toMatch(/\*\*/);
});

test("E — the terms make the sharer responsible and name the report route", () => {
  const text = JSON.stringify(TERMS);
  expect(text).toMatch(/shared look/i);
  expect(text).toMatch(/report/i);
  expect(text).toMatch(/may remove/i);
});

test("R2 — the policy says a piece's original can be erased while its cut-out stays", () => {
  const text = JSON.stringify(PRIVACY);
  // Only a piece with a cut-out can lose its original (spec §3.3): "any piece" would be an inaccurate legal statement.
  expect(text).not.toMatch(/erase the original photo of any piece from its page/i);
  expect(text).toMatch(/erase the original photo of any piece that has a cut-out/i);
  expect(text).toMatch(/for other pieces, write to legal@fitcheck\.space/i);
  expect(text).toMatch(/cut-out stays in your looks/i);
  expect(text).toMatch(/can.t be used to re-make a better cut-out/i);
});

test("the policy says a removed piece can be deleted for good, and what past looks keep", () => {
  const text = JSON.stringify(PRIVACY);
  expect(text).toMatch(/delete a removed piece for good/i);
  expect(text).toMatch(/past looks keep their other pieces/i);
});

const PREVAILS: Record<Exclude<Locale, "en-US" | "en-GB">, RegExp> = {
  uk: /англійська версія/i, ru: /действует английская версия/i, de: /gilt die englische Fassung/i,
  fr: /la version anglaise prévaut/i, it: /prevale la versione inglese/i, pt: /prevalece a versão inglesa/i,
  es: /prevalece la versión inglesa/i, nl: /geldt de Engelse versie/i,
};
const FACTS = [/Stripe/, /Link/, /Anthropic/, /Supabase/, /Vercel/, /Sentry/, /OpenWeather/, /Backblaze|B2/, /legal@fitcheck\.space/, /\b30\b/, /\b90\b/];
for (const [name, documents] of [["privacy", PRIVACY_BY_LOCALE], ["terms", TERMS_BY_LOCALE]] as const) {
  test.each(CONTENT_LOCALES)("%s " + name + " preserves sections, facts and date", (locale) => {
    const en = documents["en-US"], translated = documents[locale]!;
    expect(translated, `${locale} ${name} is missing`).toBeDefined();
    expect(translated.updated).toBe(en.updated);
    expect(translated.sections.map(s => s.id)).toEqual(en.sections.map(s => s.id));
    expect(new Set(en.sections.map(s => s.id)).size).toBe(en.sections.length);
    translated.sections.forEach((s, i) => {
      expect(s.paragraphs.length).toBe(en.sections[i].paragraphs.length);
      expect(s.bullets?.length ?? 0).toBe(en.sections[i].bullets?.length ?? 0);
    });
    for (const fact of FACTS) if (fact.test(JSON.stringify(en))) expect(JSON.stringify(translated)).toMatch(fact);
  });
  test.each(CONTENT_LOCALES.filter(l => l !== "en-US" && l !== "en-GB"))(name + " opens with English-prevails in %s", (locale) => {
    const rule = PREVAILS[locale as keyof typeof PREVAILS];
    const intro = documents[locale]!.intro;
    expect(intro).toMatch(rule);
    expect(intro.search(rule)).toBeLessThan(120);
  });
}

test.each(CONTENT_LOCALES)("%s explains support correspondence separately from account deletion", locale => {
  const doc = PRIVACY_BY_LOCALE[locale];
  const section = doc.sections.find(part => part.id === "contacting-support");
  expect(section, locale).toBeDefined();
  const body = JSON.stringify(section);
  for (const fact of ["support@fitcheck.space", "Resend", "Cloudflare Turnstile", "90", "legal@fitcheck.space"]) expect(body).toContain(fact);
  expect(doc.updated).toBe("2026-10-01");
});
test("direct support processors explain their data and the retention promise", () => {
  expect(processorsSection()).toMatch(/Resend.*support messages/i);
  expect(processorsSection()).toMatch(/Cloudflare Turnstile.*browser.*spam/i);
  const body = JSON.stringify(PRIVACY.sections.find(part => part.id === "contacting-support"));
  expect(body).toMatch(/reply email.*topic.*message/i);
  expect(body).toMatch(/account deletion does not automatically/i);
  expect(body).toMatch(/90 days.*last reply/i);
  expect(body).toMatch(/controller.*bot detection/i);
});

test.each(CONTENT_LOCALES)("%s discloses Cloudflare in cross-border transfers", locale => {
  const section = PRIVACY_BY_LOCALE[locale].sections.find(part => part.id === "data-leaving-europe");
  expect(section?.paragraphs.join(" ")).toContain("Cloudflare");
});
