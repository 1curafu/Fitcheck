import { closetStats, mostWorn, gatheringDust } from "../aggregate";

const items = [
  { id: "a", price: 100 },
  { id: "b", price: 50 },
  { id: "c", price: null },
];

test("closet value sums known prices and ignores unpriced pieces", () => {
  expect(closetStats(items, []).value).toBe("€150.00");
});

test("average cost per wear divides total value by total wears", () => {
  const s = closetStats(items, [{ item_id: "a" }, { item_id: "a" }, { item_id: "b" }]);
  expect(s.totalWears).toBe(3);
  expect(s.avgCostPerWear).toBe("€50.00");
});

test("no wears means no average, not a division by zero", () => {
  expect(closetStats(items, []).avgCostPerWear).toBeNull();
});

test("an entirely unpriced closet reports zero value and no average", () => {
  // €0.00 is the honest reading of "we know of no value"; an average would be
  // stating something false about pieces whose price nobody has entered.
  const s = closetStats([{ id: "c", price: null }], [{ item_id: "c" }]);
  expect(s.value).toBe("€0.00");
  expect(s.avgCostPerWear).toBeNull();
});

test("most worn ranks by count, highest first", () => {
  expect(mostWorn(items, { a: 9, b: 3, c: 1 }, 2)).toEqual(["a", "b"]);
});

test("gathering dust surfaces the longest-idle pieces with their age", () => {
  // ⚠️ The plan asserted `idle[0]` was `b` at 204 days — but its own `items`
  // fixture contains `c`, which has NO wear record at all, and never-worn
  // outranks merely-idle. Two of the plan's tests contradicted each other; this
  // is the one that was wrong. The 204 arithmetic it was really checking is
  // preserved on the second row.
  const idle = gatheringDust(items, { a: "2026-07-20", b: "2026-01-01" }, "2026-07-24", 2);
  expect(idle[0]).toEqual({ id: "c", days: null });
  expect(idle[1]).toEqual({ id: "b", days: 204 });
});

test("a never-worn item counts as idle, not as missing", () => {
  // The whole point of the section: the pieces you never reach for are exactly
  // the ones with no wear rows, so treating "no data" as "nothing to report"
  // would hide the answer.
  const idle = gatheringDust([{ id: "z", price: null }], {}, "2026-07-24", 5);
  expect(idle.map((i) => i.id)).toContain("z");
});

// --- Beyond the plan: the shapes a real closet actually produces -------------

test("a never-worn piece outranks a long-idle one", () => {
  // Both are "gathering dust", but one has never been worn at all. Ordering
  // them by days-since means the never-worn piece needs a sortable age, not a
  // null that drops it to the end of the list.
  const idle = gatheringDust(
    [
      { id: "worn-long-ago", price: null },
      { id: "never", price: null },
    ],
    { "worn-long-ago": "2026-01-01" },
    "2026-07-24",
    5,
  );
  expect(idle[0].id).toBe("never");
  // null, never Infinity — the screen has to be able to say "Never worn"
  // rather than "∞ days ago".
  expect(idle[0].days).toBeNull();
  expect(idle[1].days).toBe(204);
});

test("the list is capped at n", () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ id: `i${i}`, price: null }));
  expect(gatheringDust(many, {}, "2026-07-24", 3)).toHaveLength(3);
  expect(mostWorn(many, Object.fromEntries(many.map((m, i) => [m.id, i])), 3)).toHaveLength(3);
});

test("an item worn today is not gathering dust at zero days", () => {
  const idle = gatheringDust([{ id: "a", price: null }], { a: "2026-07-24" }, "2026-07-24", 5);
  expect(idle[0]).toEqual({ id: "a", days: 0 });
});

test("most worn ignores pieces with no wears at all", () => {
  // A closet where two items have been worn should report two, not pad the
  // list with zeroes — "most worn: a piece you have never worn" is nonsense.
  expect(mostWorn(items, { a: 2, b: 1 }, 3)).toEqual(["a", "b"]);
});

test("an empty closet reports zero, not a crash", () => {
  const s = closetStats([], []);
  expect(s.value).toBe("€0.00");
  expect(s.totalWears).toBe(0);
  expect(s.avgCostPerWear).toBeNull();
  expect(mostWorn([], {}, 3)).toEqual([]);
  expect(gatheringDust([], {}, "2026-07-24", 3)).toEqual([]);
});
