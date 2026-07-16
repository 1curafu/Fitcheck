import { TagSchema, taggingJsonSchema } from "../tagging-schema";

test("accepts a well-formed tag object", () => {
  const ok = TagSchema.parse({
    category: "Tops",
    subcategory: "oxford_shirt",
    colors: ["cream", "white"],
    pattern: "solid",
    material: "cotton",
    formality: 3,
    seasons: ["Spring", "Autumn"],
  });
  expect(ok.category).toBe("Tops");
});

test("rejects an out-of-enum category", () => {
  expect(() =>
    TagSchema.parse({
      category: "Hat",
      subcategory: "x",
      colors: ["red"],
      pattern: "solid",
      material: "wool",
      formality: 2,
      seasons: ["Winter"],
    }),
  ).toThrow();
});

test("rejects formality outside 1..5", () => {
  expect(() =>
    TagSchema.parse({
      category: "Shoes",
      subcategory: "loafer",
      colors: ["brown"],
      pattern: "solid",
      material: "leather",
      formality: 9,
      seasons: ["Autumn"],
    }),
  ).toThrow();
});

test("requires at least one colour", () => {
  expect(() =>
    TagSchema.parse({
      category: "Tops",
      subcategory: "tee",
      colors: [],
      pattern: "solid",
      material: "cotton",
      formality: 1,
      seasons: ["Summer"],
    }),
  ).toThrow();
});

test("exposes a JSON Schema for the Anthropic response format", () => {
  expect(taggingJsonSchema).toMatchObject({ type: "object" });
  expect(taggingJsonSchema.required).toEqual(
    expect.arrayContaining(["category", "colors", "formality"]),
  );
});
