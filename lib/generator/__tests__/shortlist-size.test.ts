import { buildCandidates, type CandidateItem } from "../candidates";
import { rankTopN } from "../rank";
import { diversify } from "../diversity";

/**
 * The shape of a real closet: more tops than bottoms than shoes, mixed season
 * tags. Proportions taken from the development closet (11/6/3), which is what
 * exposed the shortlist collapse.
 */
function closet(): CandidateItem[] {
  const mk = (category: string, i: number, seasons: string[]): CandidateItem => ({
    id: `${category}-${i}`,
    category,
    colors: [["white", "navy", "cream", "black", "brown"][i % 5]],
    formality: 3,
    seasons,
    material: "cotton", texture: null, pattern: null,
  });
  const ALL = ["Spring", "Summer", "Autumn", "Winter"];
  return [
    ...Array.from({ length: 11 }, (_, i) => mk("Tops", i, i < 8 ? ALL : ["Spring", "Summer"])),
    ...Array.from({ length: 6 }, (_, i) => mk("Bottoms", i, i < 3 ? ALL : ["Spring", "Summer"])),
    ...Array.from({ length: 3 }, (_, i) => mk("Shoes", i, ALL)),
  ];
}

function shortlist(band: [number, number], season: string, tempC: number) {
  const args = {
    band,
    weather: { tempC, rain: false },
    season,
    excludeItemIds: [],
    maxAccessories: 1,
  };
  const combos = buildCandidates(closet(), args);
  const ranked = rankTopN(combos, { aesthetic: [], band, lean: [] }, combos.length);
  return { combos: combos.length, shortlist: diversify(ranked, 20) };
}

test("summer: the re-ranker gets a full shortlist, not the distinct few", () => {
  const { combos, shortlist: s } = shortlist([1.5, 3], "Summer", 22);
  expect(combos).toBeGreaterThan(20);
  // Before tiering this was 6 — capped by the 6 bottoms.
  expect(s).toHaveLength(20);
});

test("winter: a season-narrowed closet still fills the shortlist", () => {
  const { combos, shortlist: s } = shortlist([1.5, 3], "Winter", 5);
  // Before tiering this was 3 — the model picked 3 of 3, so Regenerate could
  // not return a different set at all.
  expect(s.length).toBe(Math.min(20, combos));
  expect(s.length).toBeGreaterThan(3);
});

test("the head of the shortlist is still maximally distinct", () => {
  const { shortlist: s } = shortlist([1.5, 3], "Summer", 22);
  const tops = s.slice(0, 3).map((r) => r.items.find((i) => i.category === "Tops")!.id);
  const bottoms = s.slice(0, 3).map((r) => r.items.find((i) => i.category === "Bottoms")!.id);
  expect(new Set(tops).size).toBe(3);
  expect(new Set(bottoms).size).toBe(3);
});

test("shoe variation is reachable, which it was not before tiering", () => {
  const { shortlist: s } = shortlist([1.5, 3], "Summer", 22);
  const shoes = new Set(s.map((r) => r.items.find((i) => i.category === "Shoes")!.id));
  expect(shoes.size).toBeGreaterThan(1);
});
