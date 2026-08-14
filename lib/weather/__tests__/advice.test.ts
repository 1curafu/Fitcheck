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
