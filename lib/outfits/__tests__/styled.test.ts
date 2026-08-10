import { pinItem, styledLookName, shortlistFor } from "../styled";

const combo = (...ids: string[]) => ({ items: ids.map((id) => ({ id })) });

test("keeps only the combos that actually contain the piece", () => {
  const combos = [combo("a", "b"), combo("b", "c"), combo("a", "c")];
  expect(pinItem(combos, "a")).toHaveLength(2);
  expect(pinItem(combos, "a").every((c) => c.items.some((i) => i.id === "a"))).toBe(true);
});

test("preserves the ranked order it was given", () => {
  const combos = [combo("a", "x"), combo("q"), combo("a", "y")];
  expect(pinItem(combos, "a").map((c) => c.items[1].id)).toEqual(["x", "y"]);
});

// The caller uses this to decide whether to widen the formality band before
// giving up — an empty array is a real answer, not a failure.
test("a piece that fits no combo returns empty rather than throwing", () => {
  expect(pinItem([combo("a"), combo("b")], "zzz")).toEqual([]);
  expect(pinItem([], "a")).toEqual([]);
});

// The model names the look, but a name must exist even if that call is skipped
// or the schema repair drops the pick.
test("the fallback name is built from the piece, never left blank", () => {
  expect(styledLookName({ name: "Brushed Oxford", subcategory: "Oxford shirt", category: "Tops" }))
    .toBe("Around the Brushed Oxford");
  expect(styledLookName({ name: null, subcategory: "Oxford shirt", category: "Tops" })).toBe(
    "Around the Oxford shirt",
  );
  expect(styledLookName({ name: null, subcategory: null, category: "Tops" })).toBe(
    "Around the Tops",
  );
});

// ── The shortlist handed to the model ───────────────────────────────────────

/** A combo whose top/bottom/shoes are named, so clustering is visible. */
function slotted(top: string, bottom: string, shoe: string, score: number) {
  return {
    items: [
      { id: top, category: "Tops" },
      { id: bottom, category: "Bottoms" },
      { id: shoe, category: "Shoes" },
    ],
    score,
  };
}

test("a clustered shortlist is untangled before the model sees it", () => {
  // ⚠️ MEASURED 2026-08-10: `buildCandidates` does not currently produce a
  // clustered pinned list, so on real input this is a no-op — the shortlist
  // comes out byte-identical, same set and same order, on every closet shape
  // tried (21 pieces, the 50-piece cap, and lopsided closets up to 82). The
  // breadth-first walk already pairs each pass with a different bottom and
  // shoe, and pinning collapses diversify's top-freshness tier.
  //
  // It is kept because it costs nothing, cannot shrink the shortlist, and
  // becomes load-bearing at Task 2: with `want: 2` the head of the list must
  // be distinct or both looks come out the same. This test pins the guarantee
  // on a synthetic clustered list — one the current builder cannot emit.
  const ranked = [
    ...Array.from({ length: 20 }, (_, i) => slotted("t1", "b1", `s${i}`, 1 - i * 0.001)),
    slotted("t1", "b2", "s0", 0.5),
    slotted("t1", "b3", "s1", 0.49),
    slotted("t1", "b4", "s2", 0.48),
    slotted("t1", "b5", "s3", 0.47),
  ];

  const bottomsIn = (list: typeof ranked) =>
    new Set(list.flatMap((c) => c.items.filter((i) => i.category === "Bottoms").map((i) => i.id)));

  expect(bottomsIn(ranked.slice(0, 20)).size).toBe(1); // the shipped behaviour
  expect(bottomsIn(shortlistFor(ranked)).size).toBeGreaterThan(1);
});

test("every combo in the shortlist still contains the pinned piece", () => {
  // diversify only REORDERS a list pinItem already filtered, so the pin must
  // survive it. If it ever did not, the screen would offer looks that do not
  // contain the garment the user asked to style around.
  const ranked = [
    slotted("pinned", "b1", "s1", 0.9),
    slotted("pinned", "b2", "s2", 0.8),
    slotted("pinned", "b1", "s3", 0.7),
  ];
  for (const c of shortlistFor(ranked)) {
    expect(c.items.some((i) => i.id === "pinned")).toBe(true);
  }
});

test("the shortlist is a permutation, never a smaller set", () => {
  // The safety property that makes this change risk-free: diversify tiers and
  // then caps, so it can never return fewer candidates than the slice it
  // replaced, and never drops one.
  const ranked = [
    slotted("t1", "b1", "s1", 0.9),
    slotted("t1", "b2", "s2", 0.8),
    slotted("t1", "b1", "s3", 0.7),
  ];
  const key = (c: (typeof ranked)[number]) => c.items.map((i) => i.id).join("+");
  expect(shortlistFor(ranked).map(key).sort()).toEqual(ranked.map(key).sort());
});

test("a closet too small to diversify still yields every candidate", () => {
  // diversify tiers rather than filters, so nothing is discarded — the bug that
  // PR #15 fixed on the daily path must not reappear here.
  const ranked = [slotted("t1", "b1", "s1", 0.9), slotted("t1", "b1", "s2", 0.8)];
  expect(shortlistFor(ranked)).toHaveLength(2);
});

test("the shortlist is capped, so the prompt cannot grow without bound", () => {
  const ranked = Array.from({ length: 60 }, (_, i) => slotted(`t${i}`, `b${i}`, `s${i}`, 1 - i * 0.01));
  expect(shortlistFor(ranked)).toHaveLength(20);
});
