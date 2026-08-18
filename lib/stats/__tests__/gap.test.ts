import { biggestGap, slotCounts, GAP_CANDIDATES } from "../gap";
import type { CandidateItem } from "@/lib/generator/candidates";

const base = { occasions: ["everyday", "work"] as const };

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
  const gap = biggestGap(closet, [...base.occasions]);
  expect(gap?.candidate.category).toBe("Bottoms");
  expect(gap?.unlocks).toBeGreaterThan(0);
});

test("the count is real — it equals the increase in buildable combinations", () => {
  const closet = [piece("t1", "Tops"), piece("s1", "Shoes", { colors: ["brown"], material: "Leather" })];
  // One top × one hypothetical bottom × one shoe = 1 combo on the MILD pass.
  // The cold pass scores 0 because this closet owns no coat — see the
  // outerwear rule in `countCombos`.
  expect(biggestGap(closet, ["everyday"])?.unlocks).toBe(1);
});

// ⚠️ THE reason the screen shows `share` and not `unlocks`. The raw count scales
// with parameters we invented — four occasions rather than one, two simulated
// conditions rather than one. Adding the cold pass doubled it overnight for an
// unchanged wardrobe, and a number that moves when an internal constant changes
// cannot be defended to a customer. The share does not move.

test("the raw count scales with our parameters and the share does not", () => {
  // A coat, so the cold pass is non-zero and the slot structure is the same on
  // both passes; formality 3 throughout, so every occasion admits every piece.
  const closet = [
    ...Array.from({ length: 4 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 3 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const one = biggestGap(closet, ["everyday"])!;
  const four = biggestGap(closet, ["everyday", "work", "weekend", "evening"])!;
  expect(four.unlocks).toBe(one.unlocks * 4); // the COUNT scales exactly
  expect(four.share).toBeCloseTo(one.share, 10); // the SHARE is untouched
});

test("the share reflects the size of the slot, not the size of the closet", () => {
  // A wardrobe is a PRODUCT of its slots, so adding one piece to a slot of size
  // s multiplies that pass by (s+1)/s. The share therefore depends on the
  // BOTTLENECK's depth and not on how big the rest of the wardrobe is — which
  // is why it never becomes absurd, and why it shrinks only when that slot is
  // genuinely deep and the honest answer is "you don't need another one".
  const shallow = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const deep = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 8 }, (_, i) => piece(`s${i}`, "Shoes")),
    ...Array.from({ length: 8 }, (_, i) => piece(`o${i}`, "Outerwear")),
  ];
  expect(biggestGap(shallow, ["everyday"])!.share).toBeGreaterThan(
    biggestGap(deep, ["everyday"])!.share,
  );
});

test("outerwear can win — the design's own example must be reachable", () => {
  // ⚠️ It could not be, for weeks. A single mild simulated temperature meant
  // `needsOuterwear` was always false, so no combination ever contained a coat
  // and every outerwear candidate scored exactly 0. Measured on the real dev
  // closet: camel overcoat +0, white sneakers +258. The cold pass is what makes
  // "A camel overcoat unlocks 14 new outfits" — the design's headline — possible.
  //
  // Occasions matter here: the camel overcoat is formality 4, which the
  // *everyday* band [1.5, 3] excludes. It can only win where it is wearable.
  const noCoat = [
    ...Array.from({ length: 8 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 8 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 8 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  const gap = biggestGap(noCoat, ["work"])!;
  expect(gap.candidate.category).toBe("Outerwear");
});

test("a coatless closet is told to buy a coat before anything else", () => {
  // The failure this rule exists to prevent: with a plain slot product, going
  // from 0 coats to 1 leaves the combination count unchanged, so the single
  // most valuable purchase a coatless person can make scored exactly zero.
  const noCoat = [
    ...Array.from({ length: 3 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 3 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 3 }, (_, i) => piece(`s${i}`, "Shoes")),
  ];
  expect(biggestGap(noCoat, ["work"])!.candidate.category).toBe("Outerwear");
});

test("slot counts are the user's own numbers, and INCLUDE outerwear", () => {
  // ⚠️ Outerwear is not in `REQUIRED_CATEGORIES`, and leaving it out of this
  // made the card contradict itself on the real dev closet: it recommended a
  // camel overcoat and then explained "you have 4 pairs of shoes against 10
  // tops" — a reason for a different purchase entirely.
  const closet = [
    ...Array.from({ length: 9 }, (_, i) => piece(`t${i}`, "Tops")),
    ...Array.from({ length: 6 }, (_, i) => piece(`b${i}`, "Bottoms")),
    ...Array.from({ length: 2 }, (_, i) => piece(`s${i}`, "Shoes")),
    piece("o1", "Outerwear"),
  ];
  const counts = slotCounts(closet, ["everyday"]);
  expect(counts).toEqual({ Tops: 9, Bottoms: 6, Shoes: 2, Outerwear: 1 });
});

test("a closet with no coat reports zero, not a missing key", () => {
  // The page phrases "You have 0 coats against 9 tops" off this, so the slot
  // has to be present and zero rather than absent.
  const counts = slotCounts([piece("t1", "Tops")], ["everyday"]);
  expect(counts.Outerwear).toBe(0);
});

// NOT `expect(gap === null || gap.unlocks > 0)` — `biggestGap` only ever sets
// `best` when `unlocks > 0`, so that assertion is a tautology that can never
// fail. Assert the actual contract instead: whatever comes back is a real,
// positive unlock count.
test("a gap is only ever reported with a real, positive unlock count", () => {
  const rich = GAP_CANDIDATES.map((c, n) => piece(`x${n}`, c.category, { colors: ["navy"] }));
  const gap = biggestGap([...rich, ...rich], ["everyday"]);
  if (gap) {
    expect(gap.unlocks).toBeGreaterThan(0);
    expect(GAP_CANDIDATES).toContain(gap.candidate);
  }
});

test("an empty closet is not offered a gap — it is offered onboarding", () => {
  expect(biggestGap([], ["everyday"])).toBeNull();
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
  const gap = biggestGap(big, ["everyday"]);
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
  expect(biggestGap(complete, ["everyday"])).not.toBeNull();
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
