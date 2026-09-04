import { COLOR_NAMES } from "@/lib/ai/tagging-schema";
import { PAIRING_RATINGS, pairingRating, pairingScore } from "../pairing-ratings";

test("navy + white is a canonical 5", () => {
  expect(pairingRating("navy", "white")).toBe(5);
});

test("ratings are direction-agnostic", () => {
  // The research found no directional preference for year-round colours; the
  // seasonal asymmetry lives in WARM_WEATHER_ONLY, not here.
  expect(pairingRating("white", "navy")).toBe(pairingRating("navy", "white"));
});

test("a contested pair is rated low-middling, not banned", () => {
  const navyBlack = pairingRating("navy", "black")!;
  expect(navyBlack).toBeGreaterThanOrEqual(2);
  expect(navyBlack).toBeLessThanOrEqual(3);
});

test("an unresearched pair is null, not a made-up midpoint", () => {
  expect(pairingRating("black", "green")).toBeNull();
});

test("every key in the table is a real vocabulary colour", () => {
  for (const key of Object.keys(PAIRING_RATINGS)) {
    for (const name of key.split("|")) {
      expect(COLOR_NAMES).toContain(name);
    }
  }
});

test("keys are stored in canonical (sorted) order so lookup cannot miss", () => {
  for (const key of Object.keys(PAIRING_RATINGS)) {
    const [a, b] = key.split("|");
    expect([a, b]).toEqual([a, b].sort());
  }
});

test("pairingScore averages only the rated pairs and normalises to 0..1", () => {
  const s = pairingScore(["navy", "white"])!;
  expect(s).toBe(1); // a lone 5/5
  expect(pairingScore(["green", "plum"])).toBeNull(); // nothing rated
});

test("canonical pairs from BOTH research documents are present", () => {
  // fitcheck-r1-ext.md §2.1 — absent from the round-2 §D2 table Task 3 was built from.
  expect(pairingRating("beige", "navy")).toBe(5);
  expect(pairingRating("olive", "sand")).toBe(4);
  expect(pairingRating("forest", "beige")).toBe(4);
  expect(pairingRating("cream", "taupe")).toBe(4);
});

test("a pair named classic in BOTH documents is rated 5, per this table's own scale", () => {
  // The scale in pairing-ratings.ts: 5 = "repeatedly named classic across >= 2 sources".
  // These are named in round-2 §D2 AND in r1-ext §2.1, so 4 understated them.
  for (const [a, b] of [["camel", "navy"], ["cream", "grey"], ["navy", "stone"], ["navy", "tan"]]) {
    expect(pairingRating(a, b)).toBe(5);
  }
});

test("black+grey stays 5 — r1-ext's '4-5' range includes it, so there is no conflict", () => {
  expect(pairingRating("black", "grey")).toBe(5);
});

test("the bottom of the rating scale costs full credit, not a fifth of it", () => {
  // `/5` mapped a rating of 1 ("actively discouraged") to 0.2 — still a fifth of
  // full marks for a pairing the research says to avoid. (r-1)/4 maps 1 to 0.
  // green|red is rated 2, the lowest present: sources call it "Christmas-y
  // territory" needing deeper, muted versions.
  expect(pairingScore(["green", "red"])).toBeCloseTo(0.25);
});

test("a canonical pair still scores full marks", () => {
  expect(pairingScore(["navy", "white"])).toBe(1);
});

test("the reported outfit has NO rated pairs — and that is correct", () => {
  // ⚠️ sky/stone/white and sky/stone/cream contain no researched pair between
  // them, so this term has no opinion on the reported defect at all and returns
  // null so the caller drops it. That is the designed behaviour, not a gap:
  // TEMPERATURE is what separates cream from white (Task 2), not pairing.
  // An earlier draft of this plan asserted pairing could rank them — it cannot,
  // and asserting it would have pinned a fiction.
  expect(pairingScore(["sky", "stone", "white"])).toBeNull();
  expect(pairingScore(["sky", "stone", "cream"])).toBeNull();
});
