import { describeCombos, RerankSchema, rerankJsonSchema } from "../rerank";

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
test("schema REJECTS a pick missing name, and a name over 24 chars (D3)", () => {
  expect(() => RerankSchema.parse({ picks: [{ combo_index: 0, why: "x" }, pick(1), pick(2)] })).toThrow();
  expect(() =>
    RerankSchema.parse({ picks: [{ combo_index: 0, name: "x".repeat(25), why: "x" }, pick(1), pick(2)] }),
  ).toThrow();
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
