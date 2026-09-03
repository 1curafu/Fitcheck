import {
  TagSchema,
  taggingJsonSchema,
  MATERIALS,
  TEXTURES,
  COLOR_NAMES,
  BRANDING,
  FITS,
  LENGTHS,
  BULKS,
  DISTRESSING,
} from "../tagging-schema";

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
  accent_color: null,
  branding: null,
  fit: null,
  length: null,
  bulk: null,
  distressing: null,
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

// ── Colours are a constrained vocabulary, like material and texture ──────────

test("colors are constrained to the palette, not free text", () => {
  // PR #19 converted material and texture to enums and left colors as
  // z.array(z.string()), while adding a 21-colour picker in the same PR. The
  // model could therefore emit a colour the user could not reselect and
  // colorHex() could not render a swatch for.
  const base = {
    category: "Tops" as const,
    subcategory: "Oxford shirt",
    pattern: "solid" as const,
    material: "Cotton" as const,
    texture: "Flat" as const,
    formality: 3,
    seasons: ["Spring" as const],
    accent_color: null,
    branding: null,
    fit: null,
    length: null,
    bulk: null,
    distressing: null,
  };
  expect(() => TagSchema.parse({ ...base, colors: ["navy"] })).not.toThrow();
  expect(() => TagSchema.parse({ ...base, colors: ["chartreuse"] })).toThrow();
  expect(() => TagSchema.parse({ ...base, colors: ["light blue"] })).toThrow();
  expect(() => TagSchema.parse({ ...base, colors: ["burnt sienna"] })).toThrow();
  expect(() => TagSchema.parse({ ...base, colors: ["off-white"] })).toThrow();
});

test("COLOR_NAMES is the palette the schema enforces", () => {
  expect(COLOR_NAMES).toContain("navy");
  expect(COLOR_NAMES).toContain("chocolate");
  expect(COLOR_NAMES).not.toContain("chartreuse");
  expect(new Set(COLOR_NAMES).size).toBe(COLOR_NAMES.length); // no duplicates
});

// ── Task 2: accent_color, branding, fit, length, bulk, distressing ──────────

test("the new fields accept a valid draft", () => {
  const parsed = TagSchema.parse({
    category: "Shoes", subcategory: "Sneakers", colors: ["white"],
    pattern: "solid", material: "Leather", texture: "Flat",
    formality: 2, seasons: ["Spring"],
    accent_color: "sky", branding: "Small", fit: null, length: null, bulk: "Low profile", distressing: "None",
  });
  expect(parsed.accent_color).toBe("sky");
  expect(parsed.bulk).toBe("Low profile");
});

test("the new fields are all nullable — a model that cannot tell says so", () => {
  const parsed = TagSchema.parse({
    category: "Tops", subcategory: "Tee", colors: ["navy"],
    pattern: "solid", material: "Cotton", texture: "Flat",
    formality: 1, seasons: ["Summer"],
    accent_color: null, branding: null, fit: null, length: null, bulk: null, distressing: null,
  });
  expect(parsed.accent_color).toBeNull();
});

test("accent_color is constrained to the 42-colour vocabulary", () => {
  expect(() =>
    TagSchema.parse({
      category: "Shoes", subcategory: "Sneakers", colors: ["white"],
      pattern: "solid", material: "Leather", texture: "Flat",
      formality: 2, seasons: ["Spring"],
      accent_color: "chartreuse", branding: null, fit: null, length: null, bulk: null, distressing: null,
    }),
  ).toThrow();
});

test("the JSON schema sent to Anthropic carries no rejected keywords", () => {
  const json = JSON.stringify(taggingJsonSchema);
  for (const banned of ["minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum", "uniqueItems"]) {
    expect(json).not.toContain(banned);
  }
});

test("the new vocabularies are non-empty and stable", () => {
  expect(BRANDING).toEqual(["None", "Small", "Large"]);
  expect(FITS).toEqual(["Fitted", "Tailored", "Regular", "Relaxed", "Oversized"]);
  expect(LENGTHS).toEqual(["Cropped", "Natural waist", "Hip", "Knee", "Midi", "Ankle", "Floor"]);
  expect(BULKS).toEqual(["Low profile", "Regular", "Chunky"]);
  expect(DISTRESSING).toEqual(["None", "Faded", "Ripped"]);
});
