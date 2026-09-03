import { UpdateSchema } from "../update-schema";

const valid = {
  name: "Ribbed crewneck",
  brand: "Uniqlo",
  category: "Tops",
  subcategory: "Ribbed knit",
  colors: ["navy"],
  pattern: "solid",
  material: "Merino wool",
  texture: "Ribbed",
  formality: 3,
  seasons: ["Autumn", "Winter"],
  price: 79.99,
  accent_color: "rust",
  branding: "Small",
  fit: "Relaxed",
  length: "Hip",
  bulk: null,
  distressing: "None",
};

test("every AI-written field can be updated by the user", () => {
  const parsed = UpdateSchema.parse(valid);
  expect(parsed.colors).toEqual(["navy"]);
  expect(parsed.texture).toBe("Ribbed");
  expect(parsed.pattern).toBe("solid");
  expect(parsed.price).toBe(79.99);
});

test("price is optional and nullable — most items have no recorded price", () => {
  expect(UpdateSchema.parse({ ...valid, price: null }).price).toBeNull();
});

test("a negative price is rejected", () => {
  expect(() => UpdateSchema.parse({ ...valid, price: -5 })).toThrow();
});

test("an empty season set is rejected rather than silently defaulted", () => {
  expect(() => UpdateSchema.parse({ ...valid, seasons: [] })).toThrow();
});

test("material and texture are held to the shared vocabulary here too", () => {
  expect(() => UpdateSchema.parse({ ...valid, material: "unobtainium" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, texture: "sparkly" })).toThrow();
});

// The six fields added by the item-data-completeness plan (fit, branding,
// accent_color, length, bulk, distressing) must be as correctable as every
// field above — an AI-written tag the user cannot fix is a defect.
test("the six new styling fields round-trip through the update schema", () => {
  const parsed = UpdateSchema.parse({
    ...valid,
    fit: "Oversized",
    branding: "Large",
    accent_color: "sky",
    length: "Cropped",
    bulk: null,
    distressing: "Ripped",
  });
  expect(parsed.fit).toBe("Oversized");
  expect(parsed.branding).toBe("Large");
  expect(parsed.accent_color).toBe("sky");
  expect(parsed.length).toBe("Cropped");
  expect(parsed.bulk).toBeNull();
  expect(parsed.distressing).toBe("Ripped");
});

test("all six new fields are nullable — most items never get a correction", () => {
  const parsed = UpdateSchema.parse({
    ...valid,
    fit: null,
    branding: null,
    accent_color: null,
    length: null,
    bulk: null,
    distressing: null,
  });
  expect(parsed.fit).toBeNull();
  expect(parsed.branding).toBeNull();
  expect(parsed.accent_color).toBeNull();
  expect(parsed.length).toBeNull();
  expect(parsed.bulk).toBeNull();
  expect(parsed.distressing).toBeNull();
});

test("the six new fields are held to their own vocabularies", () => {
  expect(() => UpdateSchema.parse({ ...valid, fit: "Skinny" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, branding: "Medium" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, accent_color: "not-a-colour" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, length: "Regular" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, bulk: "Thick" })).toThrow();
  expect(() => UpdateSchema.parse({ ...valid, distressing: "Torn" })).toThrow();
});
