import type { Frame } from "../frame";

/**
 * Rules as data, with their evidence tier attached.
 *
 * ⚠️ The tag is ENFORCED, not documented. `applyRules` decides what a rule may
 * do from its tag alone: HARD excludes, STRONG penalises, PREFERENCE rewards,
 * and CONTESTED is structurally incapable of either — a test pins its weight to
 * zero. The research asks the engine not to silently resolve a live
 * disagreement, and a comment saying so would not survive the first person in a
 * hurry.
 *
 * ⚠️ Be stingy with HARD. Every hard rule can empty a small wardrobe, which is
 * what `relieve` at the bottom of this file exists to prevent.
 */
export type RuleTag = "HARD" | "STRONG" | "PREFERENCE" | "CONTESTED";

export type RuleItem = {
  category: string;
  colors: string[];
  material?: string | null;
  formality?: number | null;
  branding?: string | null;
  bulk?: string | null;
  distressing?: string | null;
};
export type RuleCtx = { frame: Frame; items: RuleItem[] };

export type Rule = {
  id: string;
  tag: RuleTag;
  frames: Frame[];
  /**
   * STRONG penalty · PREFERENCE bonus · HARD the relief ordering (see
   * `relieve`). Absent on CONTESTED, which may not carry one.
   */
  weight?: number;
  /** True when the rule is VIOLATED. */
  test: (ctx: RuleCtx) => boolean;
  /** Shown in the "why", and sent to the model for CONTESTED rules. */
  because: string;
};

/**
 * Where "business" starts on this app's 1..5 formality scale.
 *
 * ⚠️ The same 4 `direction.ts` already calls DRESSY, deliberately, rather than a
 * second number chosen by hand for this file.
 */
const BUSINESS = 4;

const branded = (items: RuleItem[]) => items.filter((i) => i.branding && i.branding !== "None");
const loud = (items: RuleItem[]) => items.filter((i) => i.branding === "Large").length;
const colours = (items: RuleItem[]) =>
  new Set(items.flatMap((i) => i.colors.map((c) => c.trim().toLowerCase())));
const topFormality = (items: RuleItem[]) => Math.max(0, ...items.map((i) => i.formality ?? 0));
const isAthleticShoe = (i: RuleItem) =>
  i.category === "Shoes" &&
  (["Canvas", "Nylon", "Polyester", "Rubber"].includes(i.material ?? "") || i.bulk === "Chunky");

export const RULES: Rule[] = [
  {
    id: "sneaker-at-formal",
    tag: "HARD",
    // Streetwear has no tier-5 register at all — "formal streetwear" in the
    // sources means elevated dressy-casual — so there is no frame in which this
    // is correct.
    frames: ["classic", "streetwear"],
    weight: 0.5,
    because: "an athletic shoe does not belong with formal evening wear in any tradition",
    test: ({ items }) => items.some(isAthleticShoe) && topFormality(items) >= 5,
  },
  {
    id: "distressed-at-formal",
    tag: "HARD",
    frames: ["classic", "streetwear"],
    weight: 0.5,
    because: "distressed denim is excluded from business dress",
    // One of the few rules the research states outright as HARD, with four
    // citations: "distressed, ripped, or light-wash denim is excluded from
    // business formal and most business casual tiers".
    test: ({ items }) =>
      items.some((i) => i.distressing && i.distressing !== "None") &&
      topFormality(items) >= BUSINESS,
  },
  {
    id: "logos-past-two",
    tag: "STRONG",
    frames: ["classic", "streetwear"],
    weight: 0.3,
    because: "past two branded pieces an outfit stops communicating anything",
    // ⚠️ VISIBLE branding, so a Small logo counts. Both sources are about how
    // many logos are in play, not how loud each is: "three or more visible
    // logos in a single outfit stops communicating anything except that you own
    // a lot of branded things".
    test: ({ items }) => branded(items).length >= 3,
  },
  {
    id: "two-loud-logos-no-hierarchy",
    tag: "STRONG",
    frames: ["classic", "streetwear"],
    weight: 0.15,
    because: "two logos of the same prominence compete instead of ranking",
    // "A clean rule is to wear one loud logo and one subtle logo at most" —
    // two work with a hierarchy, not without one.
    test: ({ items }) => branded(items).length === 2 && loud(items) === 2,
  },
  {
    id: "loud-logo-in-classic",
    tag: "STRONG",
    frames: ["classic"],
    weight: 0.25,
    because: "a loud logo reads as a different tradition to the rest of this outfit",
    // The one genuinely frame-scoped rule here, and it is reachable: the frame
    // is decided by footwear first, so a dress-shoe outfit stays classic even
    // carrying a large logo. Classic's own tiers exclude "graphic branding"
    // from smart casual up, and "any graphics and logos" at business formal.
    test: ({ items }) => loud(items) >= 1,
  },
  {
    id: "black-with-navy",
    tag: "CONTESTED",
    frames: ["classic", "streetwear"],
    because:
      "black with navy: traditionally avoided, but current sources accept it when texture or pattern separates the two — judge it in this outfit",
    test: ({ items }) => {
      const c = colours(items);
      return c.has("black") && c.has("navy");
    },
  },
  {
    id: "black-with-brown",
    tag: "CONTESTED",
    frames: ["classic", "streetwear"],
    because:
      "black with brown: contested — it works via charcoal substitution, heavy winter fabric, or keeping brown to outerwear and accessories",
    test: ({ items }) => {
      const c = colours(items);
      return c.has("black") && (c.has("brown") || c.has("chocolate"));
    },
  },
];

/**
 * ⚠️ THREE RULES THE PLAN SPECIFIED AND THIS FILE DELIBERATELY DOES NOT HAVE.
 *
 * `colour-ceiling` (HARD, more than 3 distinct colours). Measured before it was
 * written: a white shirt, navy trousers, brown shoes and a grey coat is four
 * distinct names in our 42-colour vocabulary, scores 0.9272, and this rule would
 * have excluded it outright. The loud outfit it was meant to catch is already
 * caught — `colorHarmonyScore` gives it 0.75 against 1.00, and `echo.ts` already
 * caps unsupported accents at two. A duplicate that also breaks canonical looks.
 *
 * `athletic-sole-vs-formal-tailoring` (HARD). Already shipped as a 0.2-weight
 * term in `footwearAgainstOutfit`, whose own comment argues this must be a
 * weight and never a filter: a closet of one wool trouser and one canvas sneaker
 * still has to dress its owner.
 *
 * `logomania` (HARD at four or more loud logos). The research tags the logo
 * limit STRONG, at three or more VISIBLE logos, from two independent sources —
 * the plan's HARD-at-four was stricter in tag and looser in threshold than
 * anything sourced. `logos-past-two` is what the sources actually say.
 *
 * A fourth, `dress-shoe-in-streetwear`, was considered and rejected as
 * UNREACHABLE: `detectFrame` reads footwear first, so an outfit with a dress
 * shoe is never in the streetwear frame for a footwear rule to fire on.
 */

export type Verdict = {
  excluded: boolean;
  /** Sum of the violated HARD weights. Only consulted when relief fires. */
  hardPenalty: number;
  penalty: number;
  bonus: number;
  reasons: string[];
  contested: string[];
};

/**
 * Apply every in-frame rule, in the precedence the spec sets out.
 *
 * The ORDER is the contract: HARD rules exclude before any weight is computed,
 * so a combo that should not exist never competes on points.
 */
export function applyRules(ctx: RuleCtx): Verdict {
  const live = RULES.filter((r) => r.frames.includes(ctx.frame) && r.test(ctx));
  const sum = (tag: RuleTag) =>
    live.filter((r) => r.tag === tag).reduce((total, r) => total + (r.weight ?? 0), 0);

  return {
    excluded: live.some((r) => r.tag === "HARD"),
    hardPenalty: sum("HARD"),
    penalty: sum("STRONG"),
    bonus: sum("PREFERENCE"),
    reasons: live.filter((r) => r.tag !== "CONTESTED").map((r) => r.because),
    contested: live.filter((r) => r.tag === "CONTESTED").map((r) => r.because),
  };
}

/**
 * Drop the excluded combos — unless that would leave the user with nothing.
 *
 * ⚠️ This is `eligibleByCategory`'s rule at the combo level: a filter may narrow
 * a required slot but never empty one. Someone whose only shoes are trainers
 * still has to be dressed for a formal occasion, and an empty screen is a worse
 * answer than the best of a bad set.
 *
 * ⚠️ Under relief the HARD weights become ordinary penalties, which is why every
 * HARD rule declares one. Without that step every excluded combo would be
 * equally unexcluded and the shortlist would keep its raw-score order — putting
 * a combo that broke two hard rules above one that broke a single rule.
 */
export function relieve<T extends { score: number; verdict: Verdict }>(entries: T[]): T[] {
  const clean = entries.filter((e) => !e.verdict.excluded);
  if (clean.length) return clean;
  return entries
    .map((e) => ({ ...e, score: Math.max(0, e.score - e.verdict.hardPenalty) }))
    .sort((a, b) => b.score - a.score);
}
