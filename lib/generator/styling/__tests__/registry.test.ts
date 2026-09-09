import { RULES, applyRules, relieve, type Verdict } from "../registry";

const piece = (over: object = {}) => ({
  category: "Tops", colors: ["navy"], material: "Cotton", formality: 3,
  branding: "None", distressing: "None", ...over,
});
const ctx = (items: object[], frame: "classic" | "streetwear" = "classic") =>
  ({ frame, items }) as never;

test("every rule declares a tag and at least one frame", () => {
  for (const rule of RULES) {
    expect(["HARD", "STRONG", "PREFERENCE", "CONTESTED"]).toContain(rule.tag);
    expect(rule.frames.length).toBeGreaterThan(0);
  }
});

test("no CONTESTED rule carries a weight — the tag is enforced structurally", () => {
  for (const rule of RULES) if (rule.tag === "CONTESTED") expect(rule.weight ?? 0).toBe(0);
});

test("every HARD rule carries a weight, for the relief pass to order by", () => {
  for (const rule of RULES) if (rule.tag === "HARD") expect(rule.weight ?? 0).toBeGreaterThan(0);
});

test("a sneaker with formal evening wear is excluded", () => {
  const v = applyRules(ctx([
    piece({ formality: 5 }),
    piece({ category: "Shoes", material: "Canvas", bulk: "Chunky", formality: 2 }),
  ]));
  expect(v.excluded).toBe(true);
});

test("the same sneaker at smart casual is not excluded", () => {
  const v = applyRules(ctx([
    piece({ formality: 3 }),
    piece({ category: "Shoes", material: "Canvas", bulk: "Chunky", formality: 2 }),
  ]));
  expect(v.excluded).toBe(false);
});

test("ripped denim is excluded from a business-formal outfit", () => {
  const v = applyRules(ctx([
    piece({ category: "Bottoms", material: "Denim", distressing: "Ripped" }),
    piece({ formality: 4 }),
  ]));
  expect(v.excluded).toBe(true);
});

test("the same jeans in a casual outfit are fine", () => {
  const v = applyRules(ctx([
    piece({ category: "Bottoms", material: "Denim", distressing: "Ripped" }),
    piece({ formality: 2 }),
  ]));
  expect(v.excluded).toBe(false);
});

test("three branded pieces is a penalty, two is not", () => {
  const branded = (n: number) =>
    applyRules(ctx(Array.from({ length: n }, () => piece({ branding: "Small", formality: 2 })), "streetwear"));
  expect(branded(3).penalty).toBeGreaterThan(0);
  expect(branded(3).excluded).toBe(false);
  expect(branded(2).penalty).toBe(0);
});

test("a SMALL logo counts toward the limit — the sources say visible, not loud", () => {
  const v = applyRules(ctx([
    piece({ branding: "Small", formality: 2 }),
    piece({ branding: "Small", formality: 2 }),
    piece({ branding: "Large", formality: 2 }),
  ], "streetwear"));
  expect(v.penalty).toBeGreaterThan(0);
});

test("two logos of the same prominence lack the hierarchy the sources ask for", () => {
  const both = (a: string, b: string) =>
    applyRules(ctx([
      piece({ branding: a, formality: 2 }), piece({ branding: b, formality: 2 }),
    ], "streetwear")).penalty;
  expect(both("Large", "Large")).toBeGreaterThan(both("Large", "Small"));
});

test("a loud logo costs in the classic frame and not in the streetwear one", () => {
  const items = [piece({ branding: "Large", formality: 3 })];
  expect(applyRules(ctx(items, "classic")).penalty).toBeGreaterThan(
    applyRules(ctx(items, "streetwear")).penalty,
  );
});

test("CONTESTED rules never exclude and never score — they are reported", () => {
  const v = applyRules(ctx([
    piece({ colors: ["navy"] }),
    piece({ category: "Bottoms", colors: ["black"] }),
  ]));
  expect(v.excluded).toBe(false);
  expect(v.penalty).toBe(0);
  expect(v.contested.join(" ")).toContain("black");
});

test("black with brown is reported too, and only when both are present", () => {
  const has = (cols: string[][]) =>
    applyRules(ctx(cols.map((c) => piece({ colors: c })))).contested.length;
  expect(has([["black"], ["brown"]])).toBeGreaterThan(0);
  expect(has([["black"], ["grey"]])).toBe(0);
});

// The relief valve.
const entry = (score: number, verdict: object) =>
  ({ score, verdict }) as unknown as { score: number; verdict: Verdict };

test("relief keeps only the clean combos when clean combos exist", () => {
  const clean = entry(0.8, { excluded: false, hardPenalty: 0 });
  const dirty = entry(0.95, { excluded: true, hardPenalty: 0.5 });
  expect(relieve([dirty, clean])).toEqual([clean]);
});

test("when EVERY combo is excluded the exclusions lift rather than showing nothing", () => {
  const worse = entry(0.9, { excluded: true, hardPenalty: 1 });
  const better = entry(0.85, { excluded: true, hardPenalty: 0.2 });
  const out = relieve([worse, better]);
  expect(out.length).toBe(2);
  // ⚠️ The least-bad wins, not the highest raw score. Without the hard weight
  // these two would keep their original order and the worse outfit would lead.
  expect(out[0].score).toBeCloseTo(0.65);
  expect(out[1].score).toBeCloseTo(0); // 0.9 - 1, clamped
});

test("relief never returns a negative score", () => {
  const out = relieve([entry(0.3, { excluded: true, hardPenalty: 1 })]);
  expect(out[0].score).toBeGreaterThanOrEqual(0);
});
