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
