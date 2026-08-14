import { laterAdvice } from "../advice";
const H = (o: { hh: string; tempC: number; rain: boolean }[]) =>
  o.map((c, i) => ({ ...c, isNow: i === 0 }));

test("rain later → names the hour; the clause advises a shell (and survives into the sentence)", () => {
  const a = laterAdvice(
    H([
      { hh: "18:00", tempC: 14, rain: false },
      { hh: "20:00", tempC: 12, rain: false },
      { hh: "21:00", tempC: 11, rain: true },
      { hh: "23:00", tempC: 9, rain: true },
    ]),
  );
  expect(a.sentence).toMatch(/Rain from 21:00 .* shell/i);
  expect(a.adviceClause).toMatch(/shell/i); // NOT /layer/ — that also matches "no extra layer"
  expect(a.sentence).toContain(a.adviceClause);
});
test("big evening temp drop (≥5°) → names the low and advises a jacket", () => {
  const a = laterAdvice(
    H([
      { hh: "18:00", tempC: 17, rain: false },
      { hh: "20:00", tempC: 14, rain: false },
      { hh: "21:00", tempC: 11, rain: false },
      { hh: "23:00", tempC: 9, rain: false },
    ]),
  );
  expect(a.sentence).toMatch(/9°/);
  expect(a.adviceClause).toMatch(/jacket/i);
  expect(a.sentence).toContain(a.adviceClause);
});
test("stable dry evening → reassuring, no layer needed", () => {
  const a = laterAdvice(
    H([
      { hh: "18:00", tempC: 19, rain: false },
      { hh: "20:00", tempC: 19, rain: false },
      { hh: "21:00", tempC: 18, rain: false },
      { hh: "23:00", tempC: 18, rain: false },
    ]),
  );
  expect(a.adviceClause).toMatch(/no extra layer|stays dry|you're set/i);
});
test("sentence and adviceClause are always non-empty strings", () => {
  const a = laterAdvice(
    H([
      { hh: "18:00", tempC: 14, rain: false },
      { hh: "20:00", tempC: 14, rain: false },
      { hh: "21:00", tempC: 14, rain: false },
      { hh: "23:00", tempC: 14, rain: false },
    ]),
  );
  expect(a.sentence.length).toBeGreaterThan(0);
  expect(a.adviceClause.length).toBeGreaterThan(0);
});

test("the evening-drop sentence respects the user's temperature unit", () => {
  // The advice sentence is the one place a temperature is baked into prose
  // server-side, so it cannot be converted at the render boundary like the rest.
  const hourly = [
    { hh: "12", tempC: 20, rain: false, isNow: true },
    { hh: "21", tempC: 10, rain: false, isNow: false },
  ];
  expect(laterAdvice(hourly, "C").sentence).toContain("10°");
  expect(laterAdvice(hourly, "F").sentence).toContain("50°");
});

test("the advice clause is unchanged by the unit — the rust binding depends on it", () => {
  const hourly = [
    { hh: "12", tempC: 20, rain: false, isNow: true },
    { hh: "21", tempC: 10, rain: false, isNow: false },
  ];
  const f = laterAdvice(hourly, "F");
  expect(f.adviceClause).toBe("carry a jacket.");
  expect(f.sentence.includes(f.adviceClause)).toBe(true);
});

// ── The day still to come ───────────────────────────────────────────────────
// The generator builds the look for the day's HIGH (see lib/generator/rules.ts,
// `planningTemp`), so on a morning that climbs the outfit is deliberately
// lighter than right now justifies. This sentence is the only thing that
// explains that, and it is the half of the decision that makes dressing for the
// peak honest rather than just wrong in the other direction.

test("a steep climb is announced, so a light look at 20° makes sense", () => {
  const morning = [
    { hh: "08:00", tempC: 20, rain: false, isNow: true },
    { hh: "09:00", tempC: 22, rain: false, isNow: false },
  ];
  const { sentence, adviceClause } = laterAdvice(morning, "C", 35);
  expect(sentence).toContain("35");
  expect(sentence).toContain("this afternoon");
  expect(adviceClause).toBe("you're dressed for it.");
});

test("a day that is not going anywhere says nothing about the climb", () => {
  const flat = [
    { hh: "14:00", tempC: 22, rain: false, isNow: true },
    { hh: "15:00", tempC: 23, rain: false, isNow: false },
  ];
  expect(laterAdvice(flat, "C", 24).sentence).not.toContain("this afternoon");
});

test("rain still outranks the climb — a shell is the more urgent instruction", () => {
  const hotAndWet = [
    { hh: "08:00", tempC: 20, rain: false, isNow: true },
    { hh: "10:00", tempC: 24, rain: true, isNow: false },
  ];
  expect(laterAdvice(hotAndWet, "C", 35).adviceClause).toBe("take a shell.");
});

test("the climb is rendered in the user's unit", () => {
  const morning = [{ hh: "08:00", tempC: 20, rain: false, isNow: true }];
  expect(laterAdvice(morning, "F", 35).sentence).toContain("95"); // 35C = 95F
});

test("omitting the high leaves the sentence exactly as it was", () => {
  const evening = [
    { hh: "18:00", tempC: 18, rain: false, isNow: true },
    { hh: "22:00", tempC: 11, rain: false, isNow: false },
  ];
  expect(laterAdvice(evening, "C")).toEqual(laterAdvice(evening, "C", undefined));
  expect(laterAdvice(evening, "C").adviceClause).toBe("carry a jacket.");
});

// ── The advice must match the look beside it ────────────────────────────────
// Measured 2026-08-14, after the day-planning change shipped: on a −2°C day the
// strip read "Up to 3° this afternoon — you're dressed for it." The rise branch
// fired on any 5° climb, so it printed a sentence written for heat AND
// suppressed the evening-drop message, in the season where advice matters most.
// And on a 6°→18° spring morning it said "you're dressed for it" while the look
// was a linen shirt with no coat — the LAYER instruction was never built.
//
// The rule that resolves both: the strip never tells you to carry something the
// look already includes, and never reassures you about a day you are not yet
// dressed for. `OUTERWEAR_C` is shared with the generator so the two cannot drift.

const cells = (temps: number[], startHour = 8) =>
  temps.map((t, k) => ({
    hh: `${String(startHour + k).padStart(2, "0")}:00`,
    tempC: t,
    rain: false,
    isNow: k === 0,
  }));

test("a freezing day does not get a sentence written for heat", () => {
  const { sentence, adviceClause } = laterAdvice(cells([-2, -1, 0, 1]), "C", 3);
  expect(sentence).not.toContain("dressed for it");
  expect(sentence).not.toContain("Up to");
  expect(adviceClause).toBe("the coat earns its place.");
});

test("a cold evening is told about the drop, and not to carry what it is wearing", () => {
  // The look already has outerwear below 15°, so "carry a jacket" would be
  // describing the flat-lay back at the user.
  const { sentence, adviceClause } = laterAdvice(cells([8, 6, 4, 2], 18), "C", 9);
  expect(sentence).toContain("2");
  expect(adviceClause).toBe("keep the coat on.");
});

test("a cold morning of a warm day gets the LAYER instruction", () => {
  // The look is built for 18° and carries no coat, so at 6° the user needs to
  // be told. This is the half of "dress for the peak plus advice" that was
  // missing, and the reason this file changed at all.
  const { sentence, adviceClause } = laterAdvice(cells([6, 8, 10, 12]), "C", 18);
  expect(sentence).toContain("18");
  expect(adviceClause).toBe("take a layer for now.");
});

test("once it is already warm, the climb is reassurance rather than an instruction", () => {
  const { adviceClause } = laterAdvice(cells([23, 26, 29, 31]), "C", 35);
  expect(adviceClause).toBe("you're dressed for it.");
});

test("rain still outranks every temperature branch, cold or hot", () => {
  const wetAndFreezing = [
    { hh: "08:00", tempC: -2, rain: false, isNow: true },
    { hh: "10:00", tempC: 0, rain: true, isNow: false },
  ];
  expect(laterAdvice(wetAndFreezing, "C", 3).adviceClause).toBe("take a shell.");
});

test("the layer instruction is rendered in the user's unit", () => {
  expect(laterAdvice(cells([6, 8]), "F", 18).sentence).toContain("64"); // 18C = 64F
});

test("with no day high, behaviour is exactly what it was before any of this", () => {
  const evening = cells([18, 15, 13, 11], 18);
  expect(laterAdvice(evening, "C")).toEqual(laterAdvice(evening, "C", undefined));
  expect(laterAdvice(evening, "C").adviceClause).toBe("carry a jacket.");
});
