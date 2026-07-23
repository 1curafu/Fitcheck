import { reassembleLooks, type StoredLook, type ItemRow } from "../reassemble";

const slot = { xPct: 10, yPct: 20, wPct: 30, hPct: 40, rotationDeg: -3, z: 2 };
const stored: StoredLook[] = [
  {
    lookName: "The Off-Duty Camel",
    why: "the camel knit warms the grey trousers",
    anchorIndex: 1,
    pieces: [
      { itemId: "t1", slot },
      { itemId: "b1", slot },
    ],
  },
];
const items = new Map<string, ItemRow>([
  ["t1", { id: "t1", category: "Tops", subcategory: "knit", brand: "Uniqlo", name: "Camel knit", colors: ["camel"] }],
  ["b1", { id: "b1", category: "Bottoms", subcategory: "trousers", brand: "Zara", name: "Grey trousers", colors: ["grey"] }],
]);
const signed = new Map([
  ["t1.png", "https://signed/t1"],
  ["b1.png", "https://signed/b1"],
]);
const pathFor = (id: string) => `${id}.png`;

test("rebuilds a stored look, reading item details LIVE from the closet", () => {
  const looks = reassembleLooks(stored, items, signed, pathFor)!;
  expect(looks).toHaveLength(1);
  expect(looks[0].name).toBe("The Off-Duty Camel");
  expect(looks[0].pieces[0].brand).toBe("Uniqlo");
  expect(looks[0].pieces[0].cutoutUrl).toBe("https://signed/t1");
});
test("preserves the stored geometry and anchor exactly, so the flat-lay re-renders identically", () => {
  const looks = reassembleLooks(stored, items, signed, pathFor)!;
  expect(looks[0].pieces[0].slot).toEqual(slot);
  expect(looks[0].anchorIndex).toBe(1);
});

// A stored look is only as valid as the closet behind it. Rather than render a
// look with a hole in it, we declare the day's set stale and let the caller
// regenerate — the user sees a complete outfit or a fresh one, never a gap.
test("a piece whose item was deleted from the closet makes the whole set stale", () => {
  const without = new Map(items);
  without.delete("b1");
  expect(reassembleLooks(stored, without, signed, pathFor)).toBeNull();
});
test("a piece with no signed URL makes the set stale rather than rendering a broken image", () => {
  expect(
    reassembleLooks(stored, items, new Map([["t1.png", "https://signed/t1"]]), pathFor),
  ).toBeNull();
});
