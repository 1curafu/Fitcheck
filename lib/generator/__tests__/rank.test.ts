import { rankTopN, RECENT_WEIGHT } from "../rank";
const ctx = { aesthetic: ["smart_casual"], band: [2.5, 4] as [number, number] };

test("returns at most N, best-first, each with a score", () => {
  const combos = [
    [
      { id: "t1", category: "top", colors: ["rust"], formality: 1 },
      { id: "b1", category: "bottom", colors: ["olive"], formality: 5 },
      { id: "s1", category: "shoes", colors: ["camel"], formality: 2 },
    ],
    [
      { id: "t2", category: "top", colors: ["cream"], formality: 3 },
      { id: "b2", category: "bottom", colors: ["navy"], formality: 3 },
      { id: "s2", category: "shoes", colors: ["brown"], formality: 4 },
    ],
  ];
  const ranked = rankTopN(combos, ctx, 1);
  expect(ranked).toHaveLength(1);
  expect(ranked[0].items[0].colors).toContain("cream"); // the coherent neutral combo wins
  expect(ranked[0].score).toBeGreaterThan(0);
});

// ── the recency preference ────────────────────────────────────────────────────
// A regenerate sinks the pieces the user just rejected. It is a PREFERENCE, not
// a filter: a closet with one valid combo must return that combo again rather
// than an empty screen.

const item = (id: string, category: string, color: string) => ({
  id,
  category,
  colors: [color],
  formality: 3,
});

// Two combos of identical scoring quality — same colours, same formality — so
// the ONLY thing that can separate them is the recency penalty.
const comboA = [item("top-a", "Tops", "navy"), item("bot-a", "Bottoms", "cream")];
const comboB = [item("top-b", "Tops", "navy"), item("bot-b", "Bottoms", "cream")];
const plain = { aesthetic: [], band: [1.5, 3] as [number, number], lean: [] };

test("with no recentlyShown, ranking is unchanged", () => {
  const out = rankTopN([comboA, comboB], plain, 2);
  expect(out[0].score).toBe(out[1].score);
});

test("a combo made entirely of just-shown pieces sinks below a fresh one", () => {
  const out = rankTopN([comboA, comboB], { ...plain, recentlyShown: ["top-a", "bot-a"] }, 2);
  expect(out[0].items[0].id).toBe("top-b");
});

test("the penalty is proportional — one shared piece sinks less than two", () => {
  const half = rankTopN([comboA], { ...plain, recentlyShown: ["top-a"] }, 1)[0].score;
  const all = rankTopN([comboA], { ...plain, recentlyShown: ["top-a", "bot-a"] }, 1)[0].score;
  const none = rankTopN([comboA], plain, 1)[0].score;
  expect(all).toBeLessThan(half);
  expect(half).toBeLessThan(none);
});

test("a fully-repeated combo is still RANKED, never removed", () => {
  // The whole point of a soft preference: on a closet with one valid combo,
  // Regenerate returns that combo again rather than "Nothing to style yet".
  const out = rankTopN([comboA], { ...plain, recentlyShown: ["top-a", "bot-a"] }, 20);
  expect(out).toHaveLength(1);
});

test("the penalty cannot drive a score below zero", () => {
  const out = rankTopN([comboA], { ...plain, recentlyShown: ["top-a", "bot-a"] }, 1);
  expect(out[0].score).toBeGreaterThanOrEqual(0);
});

test("RECENT_WEIGHT is small enough that quality still wins", () => {
  // A genuinely better outfit that repeats a piece must still be able to beat
  // a poor fresh one — the penalty reorders near-ties, it does not dominate.
  expect(RECENT_WEIGHT).toBeLessThan(0.5);
});
