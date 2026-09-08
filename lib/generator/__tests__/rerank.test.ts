import {
  dedupePicks,
  type DescItem,
  echoNote,
  finalisePicks,
  RERANK_ACCENT_RULE,
  RERANK_VARIETY_RULE,
} from "../rerank";
import { echoedAccents, withAccent } from "../styling/echo";
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

// ── The accent reaches the model ────────────────────────────────────────────
// Review finding, 2026-09-03. `scoreCombo` now rewards an accent echoed across
// two garments, so the swoosh sneaker RISES to the top of the shortlist — and
// the model that makes the final pick, and writes the "why", could not see the
// accent at all. Exactly the failure the DescItem comment records for `pattern`
// on 2026-08-15, one signal later.

test("a garment's accent colour reaches the model, labelled as an accent", () => {
  const line = describeCombos([
    [
      {
        category: "Shoes",
        subcategory: "Sneakers",
        colors: ["white"],
        material: "Leather",
        accent_color: "sky",
      },
    ],
  ]);
  expect(line).toBe("0. Sneakers (white, leather, sky accent)");
});

test("the accent is NOT merged into the colour list", () => {
  // ⚠️ The property the whole `accent_color` column exists for: "a white shoe
  // with a sky accent" and "a white and sky shoe" are different garments, and
  // the model must be able to tell them apart. Dominant colours are "/"-joined;
  // an accent is a labelled, comma-separated note.
  const accent = describeCombos([
    [{ category: "Shoes", subcategory: "Sneakers", colors: ["white"], accent_color: "sky" }],
  ]);
  const twoTone = describeCombos([
    [{ category: "Shoes", subcategory: "Sneakers", colors: ["white", "sky"] }],
  ]);
  expect(accent).not.toBe(twoTone);
  expect(accent).not.toContain("white/sky");
  expect(twoTone).toContain("white/sky");
});

test("a garment with no accent renders exactly as it did before", () => {
  const line = describeCombos([
    [{ category: "Shoes", subcategory: "Sneakers", colors: ["white"], accent_color: null }],
  ]);
  expect(line).toBe("0. Sneakers (white)");
});

test("the prompt explains the accent and points at the stated echo", () => {
  expect(RERANK_ACCENT_RULE).toMatch(/accent/i);
  expect(RERANK_ACCENT_RULE).toMatch(/echo/i);
  expect(RERANK_ACCENT_RULE).toMatch(/why/i);
});

test("the prompt forbids inventing an echo the line does not state", () => {
  // Measured: told only to "ignore" an unsupported accent, the model wrote
  // "their sky accent echoing the top" about an outfit whose top was cream. The
  // "why" is the product; a sentence describing a colour story the clothes do
  // not have is worse than none. This is the half that earned its place.
  expect(RERANK_ACCENT_RULE).toMatch(/never describe/i);
  expect(RERANK_ACCENT_RULE).toMatch(/does not say/i);
});

// ── The echo is COMPUTED and stated, not left to the model ──────────────────
// Measured 2026-09-03: `echoScore` ranked the echoing combo first and the model
// discarded it in 9 of 9 live calls, then fabricated an echo when pushed to
// look for one. Same fix as `pattern` on 2026-08-15 — state the conclusion.

const shirt = { category: "Tops", subcategory: "Oxford shirt", colors: ["sky"] };
const trousers = { category: "Bottoms", subcategory: "Chinos", colors: ["stone"] };
const swoosh = { category: "Shoes", subcategory: "Sneakers", colors: ["white"], accent_color: "sky" };
const plainShoe = { category: "Shoes", subcategory: "Sneakers", colors: ["white"] };

test("a plural garment name takes a bare possessive, not \"sneakers's\"", () => {
  // These lines are read by a model that then writes prose back at the user.
  expect(echoNote([shirt, trousers, swoosh])).not.toContain("sneakers's");
});

test("a real echo is stated on the combo line, naming both pieces", () => {
  const line = describeCombos([[shirt, trousers, swoosh]]);
  expect(line).toContain("— the sneakers' sky accent picks up the oxford shirt");
});

test("a combo with no echo gets NO note — the fabrication guard", () => {
  // ⚠️ The property that matters most. A fact printed on a combo that has none
  // is exactly how the invented echo came back in an earlier round.
  expect(describeCombos([[shirt, trousers, plainShoe]])).not.toContain("—");
  expect(echoNote([shirt, trousers, plainShoe])).toBeNull();
});

test("an accent nothing supports is not called an echo", () => {
  // Cream top, stone chinos, sky-accented shoe: the model wrote "echoing the
  // top" about exactly this combo. Nothing here carries sky but the shoe.
  const cream = { category: "Tops", subcategory: "Crewneck", colors: ["cream"] };
  expect(echoNote([cream, trousers, swoosh])).toBeNull();
});

test("a dominant colour shared by two garments reads as a repeat, not an accent", () => {
  // `rust` and not `navy`: navy is a NEUTRAL in the palette, and neutrals never
  // echo (two navy pieces is a wardrobe, not a colour story).
  const rustTop = { category: "Tops", subcategory: "Crewneck", colors: ["rust"] };
  const rustShoe = { category: "Shoes", subcategory: "Loafers", colors: ["rust"] };
  expect(echoNote([rustTop, trousers, rustShoe])).toBe(
    "rust repeats across the crewneck and loafers",
  );
});

test("neutrals never count as an echo — two white pieces is a wardrobe, not a move", () => {
  const whiteTop = { category: "Tops", subcategory: "Tee", colors: ["white"] };
  expect(echoNote([whiteTop, trousers, plainShoe])).toBeNull();
});

test("the echo note and the score cannot disagree — both read echoedAccents", () => {
  // One implementation of "what echoes here", so a combo the scorer rewards is
  // exactly a combo the sentence can describe. ⚠️ The evidence is assembled with
  // `withAccent`, the same function `colourScore` uses — re-implementing it here
  // would make the two agree by coincidence, which is the defect this shares.
  const combo: DescItem[] = [shirt, trousers, swoosh];
  expect(echoedAccents(combo.map((it) => withAccent(it.colors, it.accent_color)))).toEqual(["sky"]);
  expect(echoNote(combo)).not.toBeNull();
});

// ── An accent is a ROLE: a neutral accent echoes, two neutral garments do not ──

test("a navy accent picking up a navy top is stated, exactly like a sky one", () => {
  // ⚠️ The case that used to be invisible. `navy` is a palette NEUTRAL, so the
  // echo rule filtered it out and the most deliberate thing about the outfit
  // never reached the model.
  const navyTop = { category: "Tops", subcategory: "Crewneck", colors: ["navy"] };
  const whiteTrousers = { category: "Bottoms", subcategory: "Chinos", colors: ["white"] };
  const navySwoosh = {
    category: "Shoes",
    subcategory: "Sneakers",
    colors: ["white"],
    accent_color: "navy",
  };
  expect(echoNote([navyTop, whiteTrousers, navySwoosh])).toBe(
    "the sneakers' navy accent picks up the crewneck",
  );
});

test("two navy GARMENTS are tonal dressing and get no note", () => {
  // Monochrome is a different mechanism with its own rule; the note would claim
  // a colour story the wearer did not make.
  const navyTop = { category: "Tops", subcategory: "Crewneck", colors: ["navy"] };
  const navyTrousers = { category: "Bottoms", subcategory: "Chinos", colors: ["navy"] };
  expect(echoNote([navyTop, navyTrousers, plainShoe])).toBeNull();
});

test("an over-matched outfit gets NO note, so the line never argues with the score", () => {
  // ⚠️ Three garments in the same accent is `echoScore`'s worst case (0.25,
  // "matchy-matchy"), while RERANK_ACCENT_RULE tells the model a stated echo is
  // worth preferring. The echo is real, so a note would not be a fabrication —
  // it would be worse: the sentence advertising what the scorer penalises.
  // ⚠️ An echo POINT is one EXTRA garment beyond the first, so three garments in
  // one colour is 2 points (0.75, still rewarded and still named). Three points
  // needs a second echo on top — here rust across three pieces plus sky across
  // two — and that is where the scorer flips to 0.25.
  const rust = (subcategory: string) => ({ category: "X", subcategory, colors: ["rust"] });
  const forced = [
    { category: "Tops", subcategory: "Crewneck", colors: ["rust", "sky"] },
    rust("Chinos"),
    rust("Loafers"),
    { category: "Accessories", subcategory: "Scarf", colors: ["sky"] },
  ];
  expect(echoNote(forced)).toBeNull();
  // …while the same colour across exactly two pieces is still named.
  expect(echoNote([rust("Crewneck"), trousers, rust("Loafers")])).toBe(
    "rust repeats across the crewneck and loafers",
  );
});

test("the variety rule covers a one-piece, not only tops and bottoms", () => {
  // ⚠️ A dress look has neither a top nor a bottom, so wording the rule around
  // those two left the model free to return three outfits built on the same
  // dress — the hole `diversity.ts` had, in prose, where a grep for category
  // names could not find it.
  expect(RERANK_VARIETY_RULE).toMatch(/dress/i);
  expect(RERANK_VARIETY_RULE).not.toMatch(/same top, and no two may share the same bottom/);
});
