import {
  StyleProfileSchema, affectsLooks, formalityRange, readNogos, readStyleProfile, toStyleProfileInput,
} from "../style-profile";

const valid = {
  archetype: "Old Money", palette: "Neutrals", fit: "Tailored",
  dress_codes: ["Smart casual", "Business"], occasions: ["Work"], nogos: ["ripped"],
};

describe("StyleProfileSchema (strict — every write)", () => {
  test("accepts a complete, known answer set", () => {
    expect(StyleProfileSchema.parse(valid)).toEqual(valid);
  });
  test.each([
    ["an unknown archetype", { archetype: "Gorpcore" }],
    ["free text as palette", { palette: "anything" }],
    ["a retired no-go", { nogos: ["bright"] }],
    ["no dress code", { dress_codes: [] }],
    ["no occasion", { occasions: [] }],
  ])("rejects %s", (_, patch) => {
    expect(() => StyleProfileSchema.parse({ ...valid, ...patch })).toThrow();
  });
  test("no-gos may be empty", () => {
    expect(StyleProfileSchema.parse({ ...valid, nogos: [] }).nogos).toEqual([]);
  });
  test("duplicates collapse", () => {
    expect(StyleProfileSchema.parse({ ...valid, nogos: ["ripped", "ripped"] }).nogos).toEqual(["ripped"]);
  });
});

describe("readStyleProfile (lenient — every read)", () => {
  test("drops retired and unknown values instead of failing", () => {
    const draft = readStyleProfile({ ...valid, nogos: ["bright", "square_toe", "ripped", 7], archetype: "Gorpcore" });
    expect(draft.nogos).toEqual(["ripped"]);
    expect(draft.archetype).toBeNull();
  });
  test("a half-answered profile reads as nulls and empty lists", () => {
    expect(readStyleProfile({ archetype: "Old Money", palette: null, fit: null, dress_codes: null, occasions: null, nogos: null }))
      .toEqual({ archetype: "Old Money", palette: null, fit: null, dress_codes: [], occasions: [], nogos: [] });
  });
  test("no row at all", () => {
    expect(readStyleProfile(null)).toEqual({ archetype: null, palette: null, fit: null, dress_codes: [], occasions: [], nogos: [] });
  });
  test("readNogos is the same filter", () => {
    expect(readNogos(["logos", "bright"])).toEqual(["logos"]);
    expect(readNogos(null)).toEqual([]);
  });
});

test("formalityRange spans the chosen dress codes", () => {
  expect(formalityRange(["Casual", "Business"])).toEqual({ formality_min: 2, formality_max: 4 });
  expect(formalityRange(["Black tie"])).toEqual({ formality_min: 5, formality_max: 5 });
});

describe("affectsLooks", () => {
  const before = { archetype: "Old Money", nogos: ["ripped"], formality_min: 3, formality_max: 4, occasions: ["Work"] };
  test("an unchanged set does not", () => {
    expect(affectsLooks(before, { ...before, nogos: ["ripped"] })).toBe(false);
  });
  test("occasion order does not matter", () => {
    expect(affectsLooks({ ...before, occasions: ["Work", "Evening"] }, { ...before, occasions: ["Evening", "Work"] })).toBe(false);
  });
  test("no-go order does not matter", () => {
    expect(affectsLooks({ ...before, nogos: ["logos", "ripped"] }, { ...before, nogos: ["ripped", "logos"] })).toBe(false);
  });
  test.each([
    ["a new no-go", { nogos: ["ripped", "shorts"] }],
    ["a removed no-go", { nogos: [] }],
    ["a new archetype", { archetype: "Streetwear" }],
    ["a different band", { formality_max: 5 }],
    // "Style with this piece" derives its occasion from these and serves an item/day cache, so a look generated and
    // narrated for Work stays Work after the user switches to Evening unless the drop is cleared.
    ["a different occasion", { occasions: ["Evening"] }],
    ["an added occasion", { occasions: ["Work", "Evening"] }],
  ])("%s does", (_, patch) => {
    expect(affectsLooks(before, { ...before, ...patch })).toBe(true);
  });
});

test("toStyleProfileInput turns quiz answers into the action payload", () => {
  expect(toStyleProfileInput({ archetype: ["Old Money"], dress_codes: ["Casual"] })).toEqual({
    archetype: "Old Money", palette: "", fit: "", dress_codes: ["Casual"], occasions: [], nogos: [],
  });
});
