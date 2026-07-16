import { filterItems, type ClosetItem } from "../filter";

const items: ClosetItem[] = [
  { id: "1", category: "Tops", colors: ["cream"], formality: 3, archived: false },
  { id: "2", category: "Bottoms", colors: ["navy"], formality: 4, archived: false },
  { id: "3", category: "Tops", colors: ["navy"], formality: 2, archived: true },
];

test("no filter returns all non-archived items", () => {
  expect(filterItems(items, {}).map((i) => i.id)).toEqual(["1", "2"]);
});

test("'All' category is treated as no category filter", () => {
  expect(filterItems(items, { category: "All" }).map((i) => i.id)).toEqual(["1", "2"]);
});

test("filters by category and excludes archived", () => {
  expect(filterItems(items, { category: "Tops" }).map((i) => i.id)).toEqual(["1"]);
});

test("filters by colour", () => {
  expect(filterItems(items, { color: "navy" }).map((i) => i.id)).toEqual(["2"]);
});
