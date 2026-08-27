import { finalise, narrateTrip, type NarrateArgs } from "../narrate";

const args: NarrateArgs = {
  days: [
    { occasion: "work", tempC: 22, rain: false, pieces: [] },
    { occasion: "evening", tempC: 19, rain: true, pieces: [] },
  ],
  capsule: [],
  aesthetic: ["Old Money"],
  destination: "Lisbon",
  beyondHorizon: false,
};

/**
 * ⚠️ The days come from the SOLVE, not from the model. A model that returns
 * fewer lines than there are days must cost the user a sentence, never leave a
 * day rendering blank.
 */
describe("finalise", () => {
  test("pads a short response to one entry per day", () => {
    const out = finalise({ capsule_why: "x", days: [{ name: "One", why: "a" }] }, 3);
    expect(out.days).toHaveLength(3);
    expect(out.days[2].name).toBe("Day 3");
    expect(out.days[2].why).toBe("");
  });

  test("truncates a long response", () => {
    const days = [1, 2, 3, 4].map((n) => ({ name: `N${n}`, why: `w${n}` }));
    expect(finalise({ capsule_why: "x", days }, 2).days).toHaveLength(2);
  });

  test("clamps an over-long name rather than rendering it", () => {
    const out = finalise(
      { capsule_why: "x", days: [{ name: "A tremendously overlong look name that will not fit", why: "w" }] },
      1,
    );
    expect(out.days[0].name.length).toBeLessThanOrEqual(40);
  });
});

// The stub is what CI runs, so it has to satisfy the same contract the model
// does — one entry per day, in order.
test("the stub returns one entry per day", async () => {
  process.env.FITCHECK_STUB_AI = "1";
  const out = await narrateTrip(args);
  expect(out.days).toHaveLength(2);
  expect(out.capsule_why).toContain("Lisbon");
});
