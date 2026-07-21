import { rankTopN } from "../rank";
const ctx = { aesthetic: ["smart_casual"], band: [2.5, 4] as [number, number] };

test("returns at most N, best-first, each with a score", () => {
  const combos = [
    [
      { category: "top", colors: ["rust"], formality: 1 },
      { category: "bottom", colors: ["olive"], formality: 5 },
      { category: "shoes", colors: ["camel"], formality: 2 },
    ],
    [
      { category: "top", colors: ["cream"], formality: 3 },
      { category: "bottom", colors: ["navy"], formality: 3 },
      { category: "shoes", colors: ["brown"], formality: 4 },
    ],
  ];
  const ranked = rankTopN(combos, ctx, 1);
  expect(ranked).toHaveLength(1);
  expect(ranked[0].items[0].colors).toContain("cream"); // the coherent neutral combo wins
  expect(ranked[0].score).toBeGreaterThan(0);
});
