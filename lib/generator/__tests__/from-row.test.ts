import {
  CANDIDATE_COLUMNS,
  CANDIDATE_SELECT,
  stylistInputFor,
  toCandidateItem,
} from "../from-row";

const row = {
  id: "i1", category: "Tops", colors: ["navy"], formality: 3, seasons: ["Autumn"],
  material: "Wool", texture: "Flat", pattern: "solid", accent_color: "rust",
  subcategory: "Oxford shirt", bulk: "Regular", branding: "Large", distressing: "Faded",
};

test("every column the generator reads survives the mapping", () => {
  // ⚠️ `toEqual` on a FULL row, deliberately, rather than spot-checking fields.
  // A field dropped from the mapping is invisible to tsc — every one is optional
  // and the literal is inferred — so this assertion is the only thing standing
  // between a new tag and the dead-data defect that has now happened twice.
  expect(toCandidateItem(row)).toEqual(row);
});

test("the mapping carries exactly the declared columns, no more and no fewer", () => {
  // Catches the other half: a column added to the select and the type but never
  // mapped, which is how `bulk` stayed dead while looking wired.
  expect(Object.keys(toCandidateItem(row)).sort()).toEqual([...CANDIDATE_COLUMNS].sort());
});

test("a row missing its array columns still yields usable lists", () => {
  const sparse = toCandidateItem({ ...row, colors: null, seasons: null });
  expect(sparse.colors).toEqual([]);
  expect(sparse.seasons).toEqual([]);
});

test("the select string names the same columns the mapping reads", () => {
  expect(CANDIDATE_SELECT.split(", ").sort()).toEqual([...CANDIDATE_COLUMNS].sort());
});

// stylistInputFor — the second half of the same defect class.
const ranked = (contested: string[]) => [
  { items: [{ id: "i1" }], verdict: { contested } },
];
const byId = new Map([["i1", { ...row, name: "Navy shirt" }]]);

test("the outfit description carries every field the prompt names", () => {
  const { combos } = stylistInputFor(ranked([]), byId);
  expect(combos[0][0]).toEqual({
    category: "Tops", subcategory: "Oxford shirt", colors: ["navy"], material: "Wool",
    texture: "Flat", pattern: "solid", accent_color: "rust", name: "Navy shirt",
  });
});

test("judgement calls are collected and de-duplicated", () => {
  const two = [...ranked(["black with navy"]), ...ranked(["black with navy", "black with brown"])];
  expect(stylistInputFor(two, byId).contested).toEqual(["black with navy", "black with brown"]);
});

test("a shortlist raising nothing contested says so", () => {
  expect(stylistInputFor(ranked([]), byId).contested).toEqual([]);
});
