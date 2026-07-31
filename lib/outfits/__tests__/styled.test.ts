import { pinItem, styledLookName } from "../styled";

const combo = (...ids: string[]) => ({ items: ids.map((id) => ({ id })) });

test("keeps only the combos that actually contain the piece", () => {
  const combos = [combo("a", "b"), combo("b", "c"), combo("a", "c")];
  expect(pinItem(combos, "a")).toHaveLength(2);
  expect(pinItem(combos, "a").every((c) => c.items.some((i) => i.id === "a"))).toBe(true);
});

test("preserves the ranked order it was given", () => {
  const combos = [combo("a", "x"), combo("q"), combo("a", "y")];
  expect(pinItem(combos, "a").map((c) => c.items[1].id)).toEqual(["x", "y"]);
});

// The caller uses this to decide whether to widen the formality band before
// giving up — an empty array is a real answer, not a failure.
test("a piece that fits no combo returns empty rather than throwing", () => {
  expect(pinItem([combo("a"), combo("b")], "zzz")).toEqual([]);
  expect(pinItem([], "a")).toEqual([]);
});

// The model names the look, but a name must exist even if that call is skipped
// or the schema repair drops the pick.
test("the fallback name is built from the piece, never left blank", () => {
  expect(styledLookName({ name: "Brushed Oxford", subcategory: "Oxford shirt", category: "Tops" }))
    .toBe("Around the Brushed Oxford");
  expect(styledLookName({ name: null, subcategory: "Oxford shirt", category: "Tops" })).toBe(
    "Around the Oxford shirt",
  );
  expect(styledLookName({ name: null, subcategory: null, category: "Tops" })).toBe(
    "Around the Tops",
  );
});
