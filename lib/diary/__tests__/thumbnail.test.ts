import { thumbnailPieces, MAX_THUMB_PIECES } from "../thumbnail";

const p = (category: string, imageUrl = `${category}.webp`) => ({ category, imageUrl });

test("a full look is capped at three pieces", () => {
  const picked = thumbnailPieces([
    p("Tops"),
    p("Bottoms"),
    p("Shoes"),
    p("Accessories"),
    p("Outerwear"),
  ]);
  expect(picked).toHaveLength(MAX_THUMB_PIECES);
});

// At a ~45px cell every extra cutout costs legibility, so the three that
// describe a look best win: one upper body, one lower, one shoe.
test("it keeps one upper piece, the bottoms and the shoes", () => {
  const picked = thumbnailPieces([p("Tops"), p("Bottoms"), p("Shoes"), p("Accessories")]);
  expect(picked.map((x) => x.imageUrl)).toEqual(["Tops.webp", "Bottoms.webp", "Shoes.webp"]);
});

test("outerwear outranks the top for the single upper slot", () => {
  const picked = thumbnailPieces([p("Tops"), p("Outerwear"), p("Bottoms"), p("Shoes")]);
  expect(picked.map((x) => x.imageUrl)).toEqual(["Outerwear.webp", "Bottoms.webp", "Shoes.webp"]);
});

test("a sparse look renders what it has rather than nothing", () => {
  expect(thumbnailPieces([p("Tops")])).toHaveLength(1);
  expect(thumbnailPieces([])).toEqual([]);
});

// A piece with no signed URL must be dropped here, not rendered as <img src="">.
test("pieces with no image are dropped", () => {
  const picked = thumbnailPieces([p("Tops", ""), p("Bottoms"), p("Shoes")]);
  expect(picked.map((x) => x.imageUrl)).toEqual(["Bottoms.webp", "Shoes.webp"]);
});

test("every piece carries in-bounds flat-lay geometry", () => {
  for (const { slot } of thumbnailPieces([p("Outerwear"), p("Bottoms"), p("Shoes")])) {
    expect(slot.xPct).toBeGreaterThanOrEqual(0);
    expect(slot.yPct).toBeGreaterThanOrEqual(0);
    expect(slot.xPct + slot.wPct).toBeLessThanOrEqual(100);
    expect(slot.yPct + slot.hPct).toBeLessThanOrEqual(100);
  }
});

// Accessories and fragrance are the CORNER slot at 14% — three pixels wide in a
// diary cell, and never what you remember an outfit by.
test("a look of only accessories still yields a thumbnail", () => {
  expect(thumbnailPieces([p("Accessories"), p("Fragrance")]).length).toBeGreaterThan(0);
});
