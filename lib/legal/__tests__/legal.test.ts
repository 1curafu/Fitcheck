import { readFileSync } from "node:fs";
import { PRIVACY } from "../privacy";
import { TERMS } from "../terms";
import { OPERATOR } from "../types";

const text = (d: typeof PRIVACY) =>
  [d.intro, ...d.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])])].join("\n");

/**
 * ⚠️ The policy is held to the CODE. Every dependency that handles user data
 * must be named in it, so adding a tracking SDK without updating the policy
 * fails the suite rather than shipping a policy that has quietly become false.
 */
const PROCESSORS: { pkg: RegExp; name: string }[] = [
  { pkg: /@supabase\//, name: "Supabase" },
  { pkg: /@anthropic-ai\//, name: "Anthropic" },
  { pkg: /@sentry\//, name: "Sentry" },
  { pkg: /@vercel\/analytics/, name: "Vercel" },
  { pkg: /^stripe$|@stripe\//, name: "Stripe" },
  { pkg: /posthog|mixpanel|amplitude|segment|hotjar|fullstory|gtag|google-analytics/, name: "" },
];

test("every data-handling dependency in package.json is named in the privacy policy", () => {
  const deps = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies ?? {});
  const policy = text(PRIVACY);
  for (const dep of deps) {
    for (const { pkg, name } of PROCESSORS) {
      if (!pkg.test(dep)) continue;
      // A blank name is a tool the policy has no wording for at all — adding it
      // is a policy decision first, a code change second.
      expect(name, `${dep} needs a privacy-policy decision before it ships`).not.toBe("");
      expect(policy, `${dep} is installed but ${name} is not in the privacy policy`).toContain(name);
    }
  }
});

test("the services the code calls directly are named too", () => {
  // Not npm packages, so the check above cannot see them.
  const policy = text(PRIVACY);
  for (const name of ["OpenWeather", "Google", "Resend"]) expect(policy).toContain(name);
});

test("what the AI receives is stated precisely — photos for tagging, text for reasoning", () => {
  const policy = text(PRIVACY);
  expect(policy).toMatch(/cut-out photo of a garment/);
  expect(policy).toMatch(/never photos/);
});

test("the policy does not promise a deletion button the app does not have", () => {
  // There is no self-serve deletion yet. Until there is, the policy must say
  // to write in — a promised button that does not exist is worse than none.
  const policy = text(PRIVACY);
  expect(policy).toContain(OPERATOR.email);
  expect(policy).not.toMatch(/delete your account in settings/i);
});

test("both documents name the operator and carry a date", () => {
  for (const d of [PRIVACY, TERMS]) {
    expect(text(d)).toContain(OPERATOR.name);
    expect(d.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the cookie section matches what the app sets: sign-in cookies only, no consent asked", () => {
  const policy = text(PRIVACY);
  expect(policy).toMatch(/only the cookies it needs to keep you signed in/i);
  expect(policy).toMatch(/notice rather than asked for consent/i);
});
