import { buildCandidates, missingCategory, eligibleByCategory, type CandidateItem } from "../candidates";
import { rankTopN } from "../rank";
import { diversify } from "../diversity";

/**
 * The three generator fixes, exercised TOGETHER.
 *
 * Each has its own unit tests — `coverage.test.ts` (PR #14), `shortlist-size.test.ts`
 * (#14/#15), `season.test.ts` and `candidates.test.ts` (#16). Nothing checked that
 * they compose, and all three rewrote the same pipeline:
 *
 *   #14 breadth-first candidates + tiered shortlist  (the whole closet is reachable)
 *   #15 recentlyShown as a soft ranking penalty      (Regenerate returns a different set)
 *   #16 season orders instead of filtering           (a season tag cannot zero a closet)
 *
 * They interact: #16 admits more candidates, which changes what #14 tiers and what
 * #15 has to reorder. This file walks the real production sequence —
 * buildCandidates -> rankTopN -> diversify — across every occasion x season, and
 * asserts the guarantee each fix was opened to deliver still holds in the presence
 * of the other two.
 */

/**
 * A closet shaped like a real one: more tops than bottoms than shoes, mixed season
 * tags, one coat that is out of season for most of the year. Proportions taken from
 * the development closet (11 tops / 6 bottoms / 3 shoes / 1 coat), which is what
 * exposed both the shortlist collapse and the season dead end.
 */
function closet(): CandidateItem[] {
  const ALL = ["Spring", "Summer", "Autumn", "Winter"];
  const mk = (
    category: string,
    i: number,
    seasons: string[],
    material = "cotton",
  ): CandidateItem => ({
    id: `${category}-${i}`,
    category,
    colors: [["white", "navy", "cream", "black", "brown"][i % 5]],
    formality: 3,
    seasons,
    material,
  });
  return [
    // 8 all-season tops, 3 that are summer-only — so winter genuinely narrows.
    ...Array.from({ length: 8 }, (_, i) => mk("Tops", i, ALL)),
    ...Array.from({ length: 3 }, (_, i) => mk("Tops", i + 8, ["Spring", "Summer"], "linen")),
    // 3 all-season bottoms, 3 that exclude winter — the slot that used to zero out.
    ...Array.from({ length: 3 }, (_, i) => mk("Bottoms", i, ALL)),
    ...Array.from({ length: 3 }, (_, i) => mk("Bottoms", i + 3, ["Spring", "Summer", "Autumn"])),
    ...Array.from({ length: 3 }, (_, i) => mk("Shoes", i, ALL, "leather")),
    // The lone coat, tagged for neither summer nor winter.
    mk("Outerwear", 0, ["Spring", "Autumn"], "polyester"),
  ];
}

const OCCASIONS: [string, [number, number]][] = [
  ["Everyday", [1.5, 3]],
  ["Work", [3, 4.5]],
  ["Weekend", [1.5, 3.5]],
  ["Evening", [3.5, 5]],
];
const SEASONS: [string, number][] = [
  ["Spring", 14],
  ["Summer", 24],
  ["Autumn", 12],
  ["Winter", 3],
];

/** The exact sequence `app/generate/actions.ts` runs, minus the AI call. */
function pipeline(
  band: [number, number],
  season: string,
  tempC: number,
  recentlyShown: string[] = [],
) {
  const args = {
    band,
    weather: { tempC, rain: false },
    season,
    excludeItemIds: [],
    maxAccessories: 1,
  };
  const combos = buildCandidates(closet(), args);
  if (!combos.length) return { combos: 0, shortlist: [] as ReturnType<typeof diversify> };
  const ranked = rankTopN(
    combos,
    { aesthetic: [], band, lean: [], recentlyShown, season },
    combos.length,
  );
  return { combos: combos.length, shortlist: diversify(ranked, 20) };
}

/** `diversify` narrows its items to {id, category}, so the helper takes that shape. */
const slot = (c: { items: { id: string; category: string }[] }, category: string) =>
  c.items.find((i) => i.category === category)!.id;

const everyCombination = (fn: (band: [number, number], season: string, tempC: number, label: string) => void) => {
  for (const [occ, band] of OCCASIONS) {
    for (const [season, tempC] of SEASONS) fn(band, season, tempC, `${occ}/${season}`);
  }
};

test("no occasion x season combination is ever a dead end (#16)", () => {
  const dead: string[] = [];
  everyCombination((band, season, tempC, label) => {
    if (pipeline(band, season, tempC).combos === 0) dead.push(label);
  });
  expect(dead).toEqual([]);
});

test("the re-ranker always receives a full shortlist (#14 tiering)", () => {
  everyCombination((band, season, tempC, label) => {
    const { combos, shortlist } = pipeline(band, season, tempC);
    // Not `toBe(20)`: a narrow band may legitimately yield fewer than 20 combos.
    // The guarantee is that NOTHING is discarded beyond the cap.
    expect(shortlist.length, label).toBe(Math.min(20, combos));
  });
});

test("the day's three looks never share a top or a bottom (#14 diversity)", () => {
  everyCombination((band, season, tempC, label) => {
    const top3 = pipeline(band, season, tempC).shortlist.slice(0, 3);
    expect(new Set(top3.map((c) => slot(c, "Tops"))).size, `${label} tops`).toBe(3);
    expect(new Set(top3.map((c) => slot(c, "Bottoms"))).size, `${label} bottoms`).toBe(3);
  });
});

test("a regenerate returns a different set in every season (#15 survives #16)", () => {
  everyCombination((band, season, tempC, label) => {
    const first = pipeline(band, season, tempC).shortlist.slice(0, 3);
    const shown = Array.from(new Set(first.flatMap((c) => c.items.map((i) => i.id))));
    const second = pipeline(band, season, tempC, shown).shortlist.slice(0, 3);
    const key = (set: typeof first) =>
      set
        .map((c) => c.items.map((i) => i.id).sort().join("+"))
        .sort()
        .join("|");
    expect(key(second), `${label} regenerate produced an identical set`).not.toBe(key(first));
  });
});

test("in-season pieces lead the shortlist, so the cap keeps the right ones (#16 ordering)", () => {
  // The summer-only tops must not occupy the head of a winter shortlist.
  const summerOnly = ["Tops-8", "Tops-9", "Tops-10"];
  const lead = pipeline([1.5, 3.5], "Winter", 3).shortlist.slice(0, 5).map((c) => slot(c, "Tops"));
  expect(lead.filter((t) => summerOnly.includes(t))).toEqual([]);
});

test("an off-season piece is still REACHABLE — ordering is not filtering (#16)", () => {
  // The whole point of the soft model: demoted, never eliminated.
  const winter = eligibleByCategory(closet(), {
    band: [1.5, 3.5],
    weather: { tempC: 3, rain: false },
    season: "Winter",
    excludeItemIds: [],
    maxAccessories: 1,
  });
  expect(winter.Tops.map((i) => i.id)).toContain("Tops-8"); // summer-only, still there
  expect(winter.Outerwear.length).toBeGreaterThan(0); // the Spring/Autumn coat, in winter
});

test("a weather exclusion narrows a required slot but never empties it (#16 relief)", () => {
  // Every shoe in this closet is leather, so make leather the excluded material by
  // putting the only shoes in suede — rain must still dress you.
  const suedeShoes = closet().map((i) =>
    i.category === "Shoes" ? { ...i, material: "suede" } : i,
  );
  const wet = {
    band: [1.5, 3.5] as [number, number],
    weather: { tempC: 14, rain: true },
    season: "Autumn",
    excludeItemIds: [],
    maxAccessories: 1,
  };
  expect(missingCategory(suedeShoes, wet)).toBeNull();
  expect(buildCandidates(suedeShoes, wet).length).toBeGreaterThan(0);
});

test("real heat excludes insulation but never a wool trouser (fibre alone never decides)", () => {
  const mixed = [
    ...closet().filter((i) => i.category !== "Bottoms"),
    { id: "b-wool", category: "Bottoms", colors: ["navy"], formality: 3, seasons: ["Summer"], material: "tropical wool" },
    { id: "b-fleece", category: "Bottoms", colors: ["grey"], formality: 3, seasons: ["Summer"], material: "polar fleece" },
    { id: "b-cotton", category: "Bottoms", colors: ["stone"], formality: 3, seasons: ["Summer"], material: "cotton" },
  ];
  const hot = {
    band: [1.5, 3.5] as [number, number],
    weather: { tempC: 32, rain: false },
    season: "Summer",
    excludeItemIds: [],
    maxAccessories: 1,
  };
  const ids = eligibleByCategory(mixed, hot).Bottoms.map((i) => i.id);
  expect(ids).toContain("b-wool"); // weight and weave decide, and we store neither
  expect(ids).not.toContain("b-fleece"); // insulation: no weave rescues it
});
