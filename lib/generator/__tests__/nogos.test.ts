import { NOGO_VALUES, comboBlocked, itemBlocked, storedLooksBlocked, type NoGoItem } from "../nogos";

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
    ["shorts", bottom({ subcategory: "Bermudas" })],
    ["logos", top({ branding: "Large" })],
    ["graphic", top({ pattern: "print", subcategory: "Graphic T-shirt" })],
    ["graphic", top({ pattern: "print", subcategory: "Tee" })],
    ["graphic", top({ pattern: "print", subcategory: "Printed sweatshirt" })],
    ["skinny", bottom({ fit: "Fitted", subcategory: "Skinny jeans" })],
  ] as const)("%s blocks its garment", (nogo, item) => {
    expect(itemBlocked(item, [nogo])).toBe(true);
  });

  test.each([
    ["ripped", bottom({ distressing: "Faded" })],
    ["skinny", top({ fit: "Fitted" })],
    ["shorts", bottom({ subcategory: "Knee-length skirt" })],
    ["shorts", bottom({ subcategory: "Short skirt" })],
    ["shorts", bottom({ subcategory: "Short pleated skirt" })],
    ["shorts", top({ subcategory: "Short-sleeve shirt" })],
    ["graphic", bottom({ pattern: "print" })],
    ["logos", top({ branding: "Small" })],
    // Found in the Opus review: the chips say "Skinny fit" and "Graphic tees", not "anything fitted" / "any print".
    ["skinny", bottom({ fit: "Fitted", subcategory: "Pencil skirt" })],
    ["graphic", top({ pattern: "print", subcategory: "Floral blouse" })],
    ["graphic", top({ pattern: "print", subcategory: "Hawaiian shirt" })],
    ["graphic", top({ pattern: "print", subcategory: null })],
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

describe("storedLooksBlocked (a look stored BEFORE the item was retagged or the no-go added)", () => {
  const items = new Map<string, NoGoItem>([
    ["tee", top()],
    ["chino", bottom()],
    ["ripped", bottom({ distressing: "Ripped" })],
    ["denimShirt", top({ material: "Denim" })],
    ["jeans", bottom({ material: "Denim" })],
    ["logoTee", top({ branding: "Large" })],
  ]);
  const look = (...ids: string[]) => ({ worn: false, pieces: ids.map((itemId) => ({ itemId })) });

  test("a stored look holding an item a no-go now blocks is blocked", () => {
    expect(storedLooksBlocked([look("tee", "ripped")], items, ["ripped"])).toBe(true);
  });
  test("a stored double-denim look is blocked", () => {
    expect(storedLooksBlocked([look("denimShirt", "jeans")], items, ["double_denim"])).toBe(true);
  });
  test("one blocked look among fine ones blocks the set", () => {
    expect(storedLooksBlocked([look("tee", "chino"), look("tee", "ripped")], items, ["ripped"])).toBe(true);
  });
  test("clean looks, or no no-gos, are not blocked", () => {
    expect(storedLooksBlocked([look("tee", "chino")], items, ["ripped", "double_denim"])).toBe(false);
    expect(storedLooksBlocked([look("tee", "ripped")], items, [])).toBe(false);
  });
  test("a WORN look is ignored: it is pinned across rebuilds, so rebuilding cannot fix it and would loop every visit", () => {
    expect(storedLooksBlocked([{ ...look("tee", "ripped"), worn: true }, look("tee", "chino")], items, ["ripped"])).toBe(false);
  });

  test("the piece a look was STYLED around is exempt — the user chose it, so it must not force a rebuild every visit", () => {
    expect(storedLooksBlocked([look("tee", "ripped")], items, ["ripped"], ["ripped"])).toBe(false);
    // …but it does not exempt its companions, or the look-level rule.
    expect(storedLooksBlocked([look("ripped", "logoTee")], items, ["ripped", "logos"], ["ripped"])).toBe(true);
  });

  test("a piece that left the closet is the reassemble path's problem, not this one's", () => {
    expect(storedLooksBlocked([look("tee", "gone")], items, ["ripped"])).toBe(false);
  });
});
