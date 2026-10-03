import { PIECE_KINDS, pieceKind } from "../kinds";

const k = (category: string, subcategory: string | null, material: string | null = null) => pieceKind({ category, subcategory, material });

test.each([
  ["Tops", "Hoodie", "hoodie"], ["Tops", "Crew sweatshirt", "hoodie"], ["Tops", "Knit polo", "polo"], ["Tops", "Polo shirt", "polo"],
  ["Tops", "Polo neck jumper", "knit"], ["Tops", "T-shirt", "tee"], ["Tops", "Graphic tee", "tee"], ["Tops", "Silk blouse", "blouse"],
  ["Tops", "Cable-knit sweater", "knit"], ["Tops", "Cardigan", "knit"], ["Tops", "Oxford shirt", "shirt"], ["Tops", "Blazer", "blazer"],
  ["Tops", "Bodysuit", "top"], ["Tops", null, "top"],
  ["Bottoms", "Jeans", "jeans"], ["Bottoms", "Wide-leg trousers", "trousers"], ["Bottoms", "Pants", "trousers"], ["Bottoms", "Slim trousers", "trousers"],
  ["Bottoms", "Chinos", "chinos"], ["Bottoms", "Bermuda shorts", "shorts"], ["Bottoms", "Pleated midi skirt", "skirt"],
  ["One-piece", "Wrap dress", "dress"], ["One-piece", "Jumpsuit", "jumpsuit"], ["One-piece", null, "dress"],
  ["Outerwear", "Navy blazer", "blazer"], ["Outerwear", "Overcoat", "coat"], ["Outerwear", "Trench", "coat"], ["Outerwear", "Bomber", "jacket"],
  ["Shoes", "Leather sneakers", "sneakers"], ["Shoes", "Running trainers", "sneakers"], ["Shoes", "Penny loafers", "loafers"],
  ["Shoes", "Block heels", "heels"], ["Shoes", "Ballet flats", "flats"], ["Shoes", "Slides", "sandals"], ["Shoes", "Chelsea boots", "boots"],
  ["Shoes", "Heeled ankle boots", "boots"], ["Shoes", "Derbies", "shoes"],
])("%s / %s → %s", (category, subcategory, kind) => expect(k(category, subcategory)).toBe(kind));

test("denim bottoms read as jeans even when the subcategory does not say so", () => {
  expect(k("Bottoms", "Straight leg", "Denim")).toBe("jeans");
});

test("bags, accessories and fragrance have no kind", () => {
  for (const category of ["Bags", "Accessories", "Fragrance"]) expect(k(category, "Tote")).toBeNull();
});

test("every kind is reachable, so every translated label is used", () => {
  const reached = new Set([
    k("Tops", "Hoodie"), k("Tops", "Polo"), k("Tops", "Knit"), k("Tops", "Tee"), k("Tops", "Blouse"), k("Tops", "Shirt"), k("Tops", "Blazer"), k("Tops", null),
    k("Bottoms", "Jeans"), k("Bottoms", "Chinos"), k("Bottoms", "Shorts"), k("Bottoms", "Skirt"), k("Bottoms", null),
    k("One-piece", "Jumpsuit"), k("One-piece", null), k("Outerwear", "Coat"), k("Outerwear", null),
    k("Shoes", "Sneakers"), k("Shoes", "Loafers"), k("Shoes", "Heels"), k("Shoes", "Flats"), k("Shoes", "Sandals"), k("Shoes", "Boots"), k("Shoes", null),
  ]);
  expect([...PIECE_KINDS].filter((kind) => !reached.has(kind))).toEqual([]);
});
