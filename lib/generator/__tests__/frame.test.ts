import { detectFrame } from "../frame";

const top = (over: object = {}) => ({ category: "Tops", material: "Cotton", ...over });
const shoe = (over: object = {}) => ({
  category: "Shoes", material: "Leather", bulk: "Low profile", ...over,
});
/**
 * ⚠️ `soleFormality` puts this at 2.5 — inside the 1.5..3.5 band where footwear
 * genuinely cannot decide. A chunky leather boot is a dress boot or a streetwear
 * boot depending on everything else in the outfit.
 *
 * The plan's own fixture here was a leather shoe on a Regular sole, which scores
 * 3.5 and is decided by footwear alone — so its tie-break tests could not have
 * passed against its own implementation.
 */
const ambiguous = () => shoe({ bulk: "Chunky" });

test("a leather dress shoe puts the outfit in the classic frame", () => {
  expect(detectFrame([top(), shoe()])).toBe("classic");
});

test("a chunky canvas sneaker puts it in the streetwear frame", () => {
  expect(detectFrame([top(), shoe({ material: "Canvas", bulk: "Chunky" })])).toBe("streetwear");
});

test("footwear outranks branding — it is the strongest signal", () => {
  expect(detectFrame([top({ branding: "Large" }), shoe()])).toBe("classic");
});

test("branding breaks the tie when footwear is ambiguous", () => {
  expect(detectFrame([top({ branding: "Large" }), ambiguous()])).toBe("streetwear");
  expect(detectFrame([top({ branding: "None" }), ambiguous()])).toBe("classic");
});

test("an oversized fit breaks the tie when footwear and branding are both quiet", () => {
  expect(detectFrame([top({ fit: "Oversized", branding: "None" }), ambiguous()])).toBe("streetwear");
});

test("a relaxed fit does NOT — only the extreme counts", () => {
  // The plan listed Relaxed alongside Oversized while its own comment said only
  // the extreme counts. Relaxed is the middle of a five-value scale and sits in
  // plenty of classic wardrobes; treating it as a streetwear anchor would put
  // relaxed chinos and a loafer in the wrong tradition.
  expect(detectFrame([top({ fit: "Relaxed", branding: "None" }), ambiguous()])).toBe("classic");
});

test("formality 5 forces classic regardless of every other signal", () => {
  const evening = [
    top({ formality: 5, branding: "Large", fit: "Oversized" }),
    shoe({ material: "Canvas", bulk: "Chunky" }),
  ];
  expect(detectFrame(evening)).toBe("classic");
});

test("an outfit with no footwear still returns a frame rather than throwing", () => {
  expect(detectFrame([top()])).toBe("classic");
});

test("a large logo on a bag counts — the anchor is the outfit's, not the garment's", () => {
  expect(detectFrame([top(), ambiguous(), { category: "Bags", branding: "Large" }])).toBe("streetwear");
});
