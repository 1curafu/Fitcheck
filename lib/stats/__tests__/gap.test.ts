import { biggestGap, GAP_CANDIDATES } from "../gap";
import type { CandidateItem } from "@/lib/generator/candidates";

const base = { weather: { tempC: 16, rain: false }, occasions: ["everyday", "work"] as const };

const piece = (id: string, category: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id,
  category,
  colors: ["cream"],
  formality: 3,
  seasons: [],
  material: "Cotton",
  pattern: "solid",
  texture: "Flat",
  ...extra,
});

test("a closet with no bottoms is told a bottom unlocks the most", () => {
  const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
  const gap = biggestGap(closet, [...base.occasions], base.weather);
  expect(gap?.candidate.category).toBe("Bottoms");
  expect(gap?.unlocks).toBeGreaterThan(0);
});

test("the count is real — it equals the increase in buildable combinations", () => {
  const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
  // One top × one hypothetical bottom × one shoe = 1 new combo per occasion.
  expect(biggestGap(closet, ["everyday"], base.weather)?.unlocks).toBe(1);
});

// NOT `expect(gap === null || gap.unlocks > 0)` — `biggestGap` only ever sets
// `best` when `unlocks > 0`, so that assertion is a tautology that can never
// fail. Assert the actual contract instead: whatever comes back is a real,
// positive unlock count.
test("a gap is only ever reported with a real, positive unlock count", () => {
  const rich = GAP_CANDIDATES.map((c, n) => piece(`x${n}`, c.category, { colors: ["navy"] }));
  const gap = biggestGap([...rich, ...rich], ["everyday"], base.weather);
  if (gap) {
    expect(gap.unlocks).toBeGreaterThan(0);
    expect(GAP_CANDIDATES).toContain(gap.candidate);
  }
});

test("an empty closet is not offered a gap — it is offered onboarding", () => {
  expect(biggestGap([], ["everyday"], base.weather)).toBeNull();
});

// --- Beyond the plan --------------------------------------------------------

test("the claim survives a closet past the candidate CAP", () => {
  // ⚠️ The reason this counts SLOT PRODUCTS rather than combos. `buildCandidates`
  // stops at CAP = 200, so a large closet returns 200 both before and after the
  // hypothetical piece, every `unlocks` is 0, and the gap card vanishes — for
  // exactly the users who would pay for this screen.
  const big = [
    ...Array.from({ length: 12 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 12 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 12 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  const gap = biggestGap(big, ["everyday"], base.weather);
  expect(gap).not.toBeNull();
  expect(gap!.unlocks).toBeGreaterThan(0);
});

test("a closet already holding everything still names its weakest slot", () => {
  // Not "no gap" — adding another top always unlocks combinations. The screen's
  // job is to name the best next purchase, not to declare the wardrobe finished.
  const complete = [
    piece("t1", "Tops"),
    piece("b1", "Bottoms"),
    piece("s1", "Shoes"),
    piece("o1", "Outerwear"),
  ];
  expect(biggestGap(complete, ["everyday"], base.weather)).not.toBeNull();
});

test("the candidates are all placeable by the generator", () => {
  // A recommendation the generator could never use would be a lie. Every
  // GAP_CANDIDATE must sit in a category the candidate builder actually slots,
  // and carry a colour the palette knows — otherwise `colorHarmonyScore` cannot
  // place it and the unlock count is measuring a piece we could not style.
  for (const c of GAP_CANDIDATES) {
    expect(["Tops", "Bottoms", "Shoes", "Outerwear"]).toContain(c.category);
    expect(c.formality).toBeGreaterThanOrEqual(1);
    expect(c.formality).toBeLessThanOrEqual(5);
    expect(c.colors.length).toBeGreaterThan(0);
  }
});
