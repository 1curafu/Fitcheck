import { describeCombos, RerankSchema, rerankJsonSchema, NAME_MAX } from "../rerank";

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
test("schema REJECTS the wrong pick count (pins 'exactly 3')", () => {
  expect(() => RerankSchema.parse({ picks: [pick(0)] })).toThrow();
  expect(() => RerankSchema.parse({ picks: [pick(0), pick(1), pick(2), pick(3)] })).toThrow();
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
