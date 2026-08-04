import { thumbnailPieces, MAX_THUMB_PIECES, DAY_CORNER } from "../thumbnail";

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

test("a look of only accessories still yields a thumbnail", () => {
  expect(thumbnailPieces([p("Accessories"), p("Fragrance")]).length).toBeGreaterThan(0);
});

// The day number lives in the bottom-right corner. Stacking it above the
// cutouts makes it legible but still puts 9px of text on a garment, so the
// geometry keeps that corner empty instead.
test("no piece intrudes on the corner the day number occupies", () => {
  const full = thumbnailPieces([p("Outerwear"), p("Tops"), p("Bottoms"), p("Shoes")]);
  expect(full.length).toBe(MAX_THUMB_PIECES);
  for (const { slot } of full) {
    const overlaps =
      slot.xPct + slot.wPct > DAY_CORNER.xPct && slot.yPct + slot.hPct > DAY_CORNER.yPct;
    expect(overlaps).toBe(false);
  }
});

// Three cutouts in a 45px cell only read if they do not sit on top of each
// other; each piece owns a distinct region.
test("the three slots occupy distinct positions", () => {
  const slots = thumbnailPieces([p("Tops"), p("Bottoms"), p("Shoes")]).map((x) => x.slot);
  const keys = slots.map((s) => `${s.xPct},${s.yPct}`);
  expect(new Set(keys).size).toBe(slots.length);
});
