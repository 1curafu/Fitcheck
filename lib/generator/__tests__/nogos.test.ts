import { NOGO_VALUES, comboBlocked, itemBlocked, type NoGoItem } from "../nogos";

const top = (x: Partial<NoGoItem> = {}): NoGoItem => ({ category: "Tops", pattern: "solid", branding: "None", ...x });
const bottom = (x: Partial<NoGoItem> = {}): NoGoItem => ({ category: "Bottoms", subcategory: "Chinos", fit: "Regular", ...x });

test("the vocabulary is exactly the six enforced chips", () => {
  expect([...NOGO_VALUES]).toEqual(["logos", "skinny", "shorts", "ripped", "double_denim", "graphic"]);
});

test("no no-gos blocks nothing", () => {
  expect(itemBlocked(bottom({ distressing: "Ripped" }), [])).toBe(false);
  expect(comboBlocked([top({ material: "Denim" }), bottom({ material: "Denim" })], [])).toBe(false);
});

describe("item rules", () => {
  test.each([
    ["ripped", bottom({ distressing: "Ripped" })],
    ["skinny", bottom({ fit: "Fitted" })],
    ["shorts", bottom({ subcategory: "Bermuda shorts" })],
    ["shorts", bottom({ subcategory: "Shorts" })],
    ["graphic", top({ pattern: "print" })],
    ["logos", top({ branding: "Large" })],
  ] as const)("%s blocks its garment", (nogo, item) => {
    expect(itemBlocked(item, [nogo])).toBe(true);
  });

  test.each([
    ["ripped", bottom({ distressing: "Faded" })],
    ["skinny", top({ fit: "Fitted" })],
    ["shorts", bottom({ subcategory: "Knee-length skirt" })],
    ["shorts", top({ subcategory: "Short-sleeve shirt" })],
    ["graphic", bottom({ pattern: "print" })],
    ["logos", top({ branding: "Small" })],
  ] as const)("%s leaves this one alone", (nogo, item) => {
    expect(itemBlocked(item, [nogo])).toBe(false);
  });

  test("a rule only fires for the no-go that owns it", () => {
    expect(itemBlocked(bottom({ distressing: "Ripped" }), ["shorts", "logos"])).toBe(false);
  });

  test("double denim is not an item rule", () => {
    expect(itemBlocked(bottom({ material: "Denim" }), ["double_denim"])).toBe(false);
  });
});

describe("double denim", () => {
  const jacket = { category: "Outerwear", material: "Denim" };
  const jeans = bottom({ material: "Denim" });

  test("a denim jacket with jeans is blocked", () => {
    expect(comboBlocked([top(), jeans, jacket], ["double_denim"])).toBe(true);
  });

  test("one denim garment is fine", () => {
    expect(comboBlocked([top(), jeans], ["double_denim"])).toBe(false);
  });

  test("denim shoes and bags do not count", () => {
    const shoe = { category: "Shoes", material: "Denim" };
    const bag = { category: "Bags", material: "Denim" };
    expect(comboBlocked([top(), jeans, shoe, bag], ["double_denim"])).toBe(false);
  });

  test("material is matched without case", () => {
    expect(comboBlocked([top({ material: "denim" }), jeans], ["double_denim"])).toBe(true);
  });
});
