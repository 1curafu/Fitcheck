import { dedupePicks, finalisePicks, RERANK_VARIETY_RULE } from "../rerank";
import {
  describeCombos,
  RerankSchema,
  rerankJsonSchema,
  stubbedRerank,
  NAME_MAX,
} from "../rerank";

test("describes each combo as one indexed line with subcategory + colours", () => {
  const t = describeCombos([
    [
      { category: "Tops", subcategory: "oxford shirt", colors: ["cream"] },
      { category: "Bottoms", subcategory: "chinos", colors: ["navy"] },
      { category: "Shoes", subcategory: "loafers", colors: ["brown"] },
    ],
  ]);
  expect(t).toMatch(/^0\. /m);
  expect(t).toContain("oxford shirt");
  expect(t).toContain("brown");
});

const pick = (i: number) => ({ combo_index: i, name: `Look ${i}`, why: "because it works" });
test("schema ACCEPTS exactly 3 valid picks with index + name + why", () => {
  const ok = RerankSchema.parse({ picks: [pick(0), pick(1), pick(2)] });
  expect(ok.picks).toHaveLength(3);
  expect(ok.picks[0].name).toBe("Look 0");
});
// A closet too small for three looks must still get its looks. `.length(3)`
// was never enforced ON the model — forStructuredOutput strips minItems/maxItems
// (they 400 the API), so it existed only as a post-hoc throw, and a closet with
// one viable combo failed the WHOLE generation as "Couldn't reach the stylist".
// Measured on a 3-item closet: the screen showed the error state, not the look.
// Same stance as clampName above — repair, don't reject.

test("a closet with only one viable look does not fail the generation", () => {
  const out = RerankSchema.parse({ picks: [pick(0)] });
  expect(out.picks).toHaveLength(1);
});

test("two looks are accepted too", () => {
  expect(RerankSchema.parse({ picks: [pick(0), pick(1)] }).picks).toHaveLength(2);
});

test("zero picks is still an error — there is nothing to show", () => {
  expect(() => RerankSchema.parse({ picks: [] })).toThrow();
});

test("more than three picks are capped rather than thrown away wholesale", () => {
  expect(finalisePicks([pick(0), pick(1), pick(2), pick(3)]).map((p) => p.combo_index)).toEqual([
    0, 1, 2,
  ]);
});

test("finalisePicks still drops duplicates and out-of-range indices", () => {
  expect(finalisePicks([pick(0), pick(0), pick(99), pick(1)], 20).map((p) => p.combo_index)).toEqual(
    [0, 1],
  );
});
test("schema REJECTS a pick missing a name entirely", () => {
  expect(() => RerankSchema.parse({ picks: [{ combo_index: 0, why: "x" }, pick(1), pick(2)] })).toThrow();
});

// A look NAME is decoration; the "why" is the product. An overlong name used to
// throw out of RerankSchema.parse and fail the whole generation as "Couldn't
// reach the stylist" — a lie, the stylist answered fine. It went unnoticed
// because the length is never enforced on the model: `forStructuredOutput`
// strips maxLength (it 400s the API), so the cap existed ONLY as a post-hoc
// throw. The prompt asks for ≤4 words, and real 4-word names ("The Relaxed
// Navy Cream" = 22) sit right on the old 24-char limit.

test("an overlong name is trimmed, never thrown — a long name cannot fail a generation", () => {
  const long = "The Impeccably Understated Charcoal Layering Piece";
  const out = RerankSchema.parse({
    picks: [{ combo_index: 0, name: long, why: "x" }, pick(1), pick(2)],
  });
  expect(out.picks[0].name.length).toBeLessThanOrEqual(NAME_MAX);
  expect(out.picks[0].name.length).toBeGreaterThan(0);
});
test("trimming falls on a word boundary, never mid-word", () => {
  const out = RerankSchema.parse({
    picks: [
      { combo_index: 0, name: "The Impeccably Understated Charcoal Layering Piece", why: "x" },
      pick(1),
      pick(2),
    ],
  });
  expect(out.picks[0].name).not.toMatch(/\s$/);
  expect("The Impeccably Understated Charcoal Layering Piece").toContain(out.picks[0].name);
});
test("a normal four-word name survives untouched", () => {
  const name = "The Relaxed Navy Cream"; // 22 chars — used to sit one word from failure
  const out = RerankSchema.parse({ picks: [{ combo_index: 0, name, why: "x" }, pick(1), pick(2)] });
  expect(out.picks[0].name).toBe(name);
});
test("rerankJsonSchema POSITIVELY describes the shape AND is free of validation keywords", () => {
  const js: any = rerankJsonSchema;
  expect(js.type).toBe("object");
  const item = js.properties.picks.items.properties;
  expect(item.combo_index).toBeDefined();
  expect(item.name).toBeDefined();
  expect(item.why).toBeDefined();
  expect(JSON.stringify(js)).not.toMatch(/minItems|maxItems|minLength|maxLength|minimum|maximum/);
});

// --- the three looks must actually be three looks ---------------------------
// The prompt asks the model to "pick the best 3" and the schema only checks the
// ARRAY length — nothing ever checked the three combo_index values differ. A
// model optimising for "best" with no variety constraint returns near-identical
// picks, and a repeated index renders the same outfit twice.

test("distinct picks pass through untouched", () => {
  const picks = [pick(0), pick(1), pick(2)];
  expect(dedupePicks(picks).map((p) => p.combo_index)).toEqual([0, 1, 2]);
});

test("a repeated combo_index is dropped rather than rendered twice", () => {
  const picks = [pick(4), pick(4), pick(7)];
  expect(dedupePicks(picks).map((p) => p.combo_index)).toEqual([4, 7]);
});

test("the first occurrence wins, so the model's best pick survives", () => {
  const first = { combo_index: 3, name: "Keep me", why: "w" };
  const dup = { combo_index: 3, name: "Drop me", why: "w" };
  expect(dedupePicks([first, dup, pick(9)])[0].name).toBe("Keep me");
});

test("three identical picks collapse to one — one real look beats three fake ones", () => {
  expect(dedupePicks([pick(1), pick(1), pick(1)])).toHaveLength(1);
});

test("an empty pick set does not throw", () => {
  expect(dedupePicks([])).toEqual([]);
});

test("the prompt tells the model the looks must differ", () => {
  // Without this the model has no reason to vary the garments at all.
  expect(RERANK_VARIETY_RULE).toMatch(/different/i);
  expect(RERANK_VARIETY_RULE).toMatch(/top/i);
});

test("a pick pointing outside the shortlist is dropped, not aimed at the first combo", () => {
  // actions.ts fell back to `top[0]` for an unknown index, so two bad indices
  // produced two copies of the same outfit — duplicates that survive dedupe
  // because the INDICES differ.
  expect(dedupePicks([pick(0), pick(99), pick(2)], 20).map((p) => p.combo_index)).toEqual([0, 2]);
});

test("a negative index is dropped too", () => {
  expect(dedupePicks([pick(-1), pick(0)], 20).map((p) => p.combo_index)).toEqual([0]);
});

test("the last valid index is inclusive", () => {
  expect(dedupePicks([pick(19)], 20).map((p) => p.combo_index)).toEqual([19]);
});

test("with no count given, indices are not range-checked", () => {
  expect(dedupePicks([pick(99)]).map((p) => p.combo_index)).toEqual([99]);
});

// A worn look is pinned into the day's set, so it still counts toward the three.
// Without this the set grew a fourth look on every wear-then-regenerate, and the
// index tabs are 01/02/03 — a fourth does not fit at 390px.
test("finalisePicks returns only as many looks as the day still has room for", () => {
  expect(finalisePicks([pick(0), pick(1), pick(2)], 20, 2).map((p) => p.combo_index)).toEqual([
    0, 1,
  ]);
  expect(finalisePicks([pick(0), pick(1), pick(2)], 20, 1).map((p) => p.combo_index)).toEqual([0]);
});

// Regenerate must always be worth pressing: even with a full set of worn looks
// it returns something new rather than silently doing nothing.
test("finalisePicks never returns an empty set, however many looks are pinned", () => {
  expect(finalisePicks([pick(0), pick(1)], 20, 0)).toHaveLength(1);
  expect(finalisePicks([pick(0), pick(1)], 20, -2)).toHaveLength(1);
});

// ── What the model is actually told ─────────────────────────────────────────
// Audit finding, 2026-08-15 (queue #15, the whole-generator pass). The
// re-ranker saw only subcategory + colours, so the pattern-clash term could
// ORDER the shortlist while the model picked blind to it — and the "why", which
// CLAUDE.md calls the product differentiator, described fabric it was inferring
// from a garment name. Text is nearly free here; images are the expensive thing
// and are still never sent.

test("fabric, weave and pattern reach the model", () => {
  const line = describeCombos([
    [
      {
        category: "Tops",
        subcategory: "Cable knit polo",
        colors: ["navy"],
        material: "Cotton",
        texture: "Cable knit",
        pattern: "striped",
      },
    ],
  ]);
  expect(line).toContain("navy");
  expect(line).toContain("cotton");
  expect(line).toContain("cable knit");
  expect(line).toContain("striped");
});

test("the unremarkable values are left out", () => {
  // "solid" on every line buries the one patterned piece, and "flat" tells a
  // reader nothing they were not already assuming.
  const line = describeCombos([
    [
      {
        category: "Tops",
        subcategory: "Oxford shirt",
        colors: ["white"],
        material: "Linen",
        texture: "Flat",
        pattern: "solid",
      },
    ],
  ]);
  expect(line).toContain("linen");
  expect(line).not.toContain("flat");
  expect(line).not.toContain("solid");
});

test("an item with no fabric data still renders cleanly", () => {
  const line = describeCombos([
    [{ category: "Shoes", subcategory: "Sneakers", colors: ["white"] }],
  ]);
  expect(line).toBe("0. Sneakers (white)");
});

test("a piece with nothing but a category does not render empty parentheses", () => {
  expect(describeCombos([[{ category: "Fragrance", colors: [] }]])).toBe("0. Fragrance");
});

// ── The e2e stub ────────────────────────────────────────────────────────────
// Lives inside `rerank` rather than in a test file, so the whole deterministic
// pipeline still runs and the code path under test stays the shipped one.

test("the stub returns as many looks as were asked for, in order", () => {
  const { picks } = stubbedRerank(20, 3);
  expect(picks.map((p) => p.combo_index)).toEqual([0, 1, 2]);
  expect(picks.every((p) => p.name && p.why)).toBe(true);
});

test("the stub never invents a combo the shortlist does not have", () => {
  // A thin closet is exactly where the real generator has failed before — a
  // pick index outside the shortlist used to render a copy of the first look.
  expect(stubbedRerank(1, 3).picks).toHaveLength(1);
  expect(stubbedRerank(0, 3).picks).toHaveLength(0);
});

test("the stub's output satisfies the same schema as the model's", () => {
  // If it did not, the stub would be testing a shape that never ships.
  expect(() => RerankSchema.parse(stubbedRerank(5, 3))).not.toThrow();
});
