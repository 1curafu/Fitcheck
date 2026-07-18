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
