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
