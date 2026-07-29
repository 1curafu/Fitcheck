import { TagSchema, taggingJsonSchema, MATERIALS, TEXTURES } from "../tagging-schema";

// The tagger now writes from a constrained vocabulary. Before this, `material`
// was a free-text string, so the AI could emit a value the edit screen could
// not offer back — and the generator's material rules matched by guesswork.
const valid = {
  category: "Tops",
  subcategory: "Ribbed knit",
  colors: ["navy"],
  pattern: "solid",
  material: "Merino wool",
  texture: "Ribbed",
  formality: 3,
  seasons: ["Autumn", "Winter"],
};

test("a full tag set including texture parses", () => {
  expect(TagSchema.parse(valid).texture).toBe("Ribbed");
});

test("material is constrained to the shared vocabulary", () => {
  expect(() => TagSchema.parse({ ...valid, material: "unobtainium" })).toThrow();
  for (const m of MATERIALS) expect(() => TagSchema.parse({ ...valid, material: m })).not.toThrow();
});

test("texture is constrained to the shared vocabulary", () => {
  expect(() => TagSchema.parse({ ...valid, texture: "sparkly" })).toThrow();
  for (const t of TEXTURES) expect(() => TagSchema.parse({ ...valid, texture: t })).not.toThrow();
});

test("free-text material no longer parses — that was the drift this closes", () => {
  // Real values from the pre-migration database.
  for (const legacy of ["cotton", "Cotton knit", "Polyester, Viscose", "knit"]) {
    expect(() => TagSchema.parse({ ...valid, material: legacy })).toThrow();
  }
});

test("accepts Fragrance and Accessories categories (generator needs the enum to exist)", () => {
  expect(() => TagSchema.parse({ ...valid, category: "Fragrance" })).not.toThrow();
  expect(() => TagSchema.parse({ ...valid, category: "Accessories" })).not.toThrow();
});

test("rejects an out-of-enum category", () => {
  expect(() => TagSchema.parse({ ...valid, category: "Hat" })).toThrow();
});

test("rejects formality outside 1..5", () => {
  expect(() => TagSchema.parse({ ...valid, formality: 9 })).toThrow();
});

test("requires at least one colour", () => {
  expect(() => TagSchema.parse({ ...valid, colors: [] })).toThrow();
});

test("exposes a JSON Schema for the Anthropic response format", () => {
  expect(taggingJsonSchema).toMatchObject({ type: "object" });
  expect(taggingJsonSchema.required).toEqual(
    expect.arrayContaining(["category", "colors", "formality", "texture", "material"]),
  );
});

test("the JSON schema sent to Anthropic carries no validation keywords", () => {
  // output_config.format rejects these outright — see CLAUDE.md. `z.enum`
  // emits only `enum`, which is supported, so constraining these two fields
  // costs nothing at the wire.
  const s = JSON.stringify(taggingJsonSchema);
  for (const k of [
    "minItems",
    "maxItems",
    "minLength",
    "maxLength",
    "minimum",
    "maximum",
    "multipleOf",
    "uniqueItems",
  ]) {
    expect(s).not.toContain(k);
  }
});

test("the vocabularies reach the model as enums", () => {
  const props = (taggingJsonSchema as { properties: Record<string, { enum?: string[] }> }).properties;
  expect(props.material.enum).toEqual([...MATERIALS]);
  expect(props.texture.enum).toEqual([...TEXTURES]);
});
