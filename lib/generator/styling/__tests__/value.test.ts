import { relativeLuminance, contrastRatio, valueContrast, textureVariety, visualSeparation } from "../value";

test("relative luminance runs black to white", () => {
  expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  expect(relativeLuminance("#141414")).toBeLessThan(0.02); // the palette's black
});

test("a malformed hex is null, not zero — zero would read as pure black", () => {
  expect(relativeLuminance("nope")).toBeNull();
  expect(relativeLuminance("#12345")).toBeNull();
  expect(relativeLuminance("")).toBeNull();
});

test("contrast ratio is symmetric and bottoms out at 1", () => {
  expect(contrastRatio(0.5, 0.5)).toBe(1);
  expect(contrastRatio(0.9, 0.1)).toBeCloseTo(contrastRatio(0.1, 0.9), 10);
  expect(contrastRatio(1, 0)).toBeCloseTo(21, 1);
});

// ---------------------------------------------------------------------------
// The defect this term exists for.
// ---------------------------------------------------------------------------

test("the endorsed trio beats the muddy one", () => {
  // Measured on develop before this term: camel/beige/camel scored 0.9090 and
  // camel/black/black 0.8869 — the trap ABOVE the endorsement.
  const trap = valueContrast([["camel"], ["beige"], ["camel"]])!;
  const endorsed = valueContrast([["camel"], ["black"], ["black"]])!;
  expect(endorsed).toBeGreaterThan(trap);
});

test("a classic separates further than the muddy trio", () => {
  const trap = valueContrast([["camel"], ["beige"], ["camel"]])!;
  expect(valueContrast([["navy"], ["white"], ["white"]])!).toBeGreaterThan(trap);
  expect(valueContrast([["white"], ["navy"], ["brown"]])!).toBeGreaterThan(trap);
});

// ⚠️ Luminance DIFFERENCE cannot do this, which is why the ratio is used. The
// two trios below span 0.2749 and 0.2827 — indistinguishable by difference —
// and 1.81 vs 5.96 by ratio. This test fails against a difference-based
// implementation, which is exactly the version that was nearly written.
test("the ratio, not the span, is what separates them", () => {
  const trap = valueContrast([["camel"], ["beige"], ["camel"]])!;
  const endorsed = valueContrast([["camel"], ["black"], ["black"]])!;
  expect(endorsed - trap).toBeGreaterThan(0.4);
});

test("a true tonal column scores zero — it is rescued by texture, not by colour", () => {
  expect(valueContrast([["black"], ["black"], ["black"]])).toBe(0);
  expect(valueContrast([["navy"], ["navy"], ["navy"]])).toBe(0);
});

test("null with nothing to compare", () => {
  expect(valueContrast([])).toBeNull();
  expect(valueContrast([["navy"]])).toBeNull();
  // A colour outside the palette contributes no value.
  expect(valueContrast([["navy"], ["notacolour"]])).toBeNull();
});

test("a garment is one value, taken from its MOST DOMINANT colour", () => {
  // ⚠️ Dominant, not darkest. The tagger writes `colors` "most-dominant first",
  // so a ["white", "navy"] sneaker is a WHITE shoe with navy panels and must
  // value as white — otherwise it stops scoring like the same shoe tagged
  // ["white"] with a navy accent, which is the same shoe.
  // ⚠️ Chosen so the two answers actually differ. navy-vs-sky and navy-vs-white
  // both saturate at 1, so that pair proves nothing; camel against beige sits
  // at 1.81 (below the 3:1 ceiling) while camel-with-black valued as BLACK
  // would jump to the top.
  const dominantCamel = valueContrast([["beige"], ["camel", "black"]]);
  expect(dominantCamel).toBe(valueContrast([["beige"], ["camel"]]));
  expect(dominantCamel).toBeLessThan(valueContrast([["beige"], ["black"]])!);
});

test("hardware contributes nothing, so a steel watch cannot flatten an outfit", () => {
  // `scoreCombo` passes [] for hardware; that garment must simply not vote.
  expect(valueContrast([["navy"], ["white"], []])).toBe(
    valueContrast([["navy"], ["white"]]),
  );
});

// ---------------------------------------------------------------------------
// Texture as visual interest.
// ---------------------------------------------------------------------------

test('"Flat" is absence, not a texture', () => {
  expect(textureVariety(["Flat", "Flat", "Flat"])).toBe(0);
  expect(textureVariety(["Flat", "Cable knit", "Flat"])).toBe(0.5);
});

test("two distinct textures already read as deliberate", () => {
  // ⚠️ Not three. The real closet is 21 Flat / 4 Twill / 4 Cable knit / 1 Fine
  // knit, so a three-texture rule would almost never fire — the same no-op the
  // accessory cap hit on a closet with no accessories.
  expect(textureVariety(["Cable knit", "Twill", "Flat"])).toBe(1);
  expect(textureVariety(["Cable knit", "Twill", "Suede"])).toBe(1);
});

test("the same texture repeated is not variety", () => {
  expect(textureVariety(["Cable knit", "Cable knit", "Cable knit"])).toBe(0.5);
});

test("nothing tagged is null, not zero", () => {
  expect(textureVariety([null, null])).toBeNull();
  expect(textureVariety([undefined, undefined])).toBeNull();
});

test("a tonal column is rescued by texture, and only by texture", () => {
  const flatBlack = visualSeparation([["black"], ["black"], ["black"]], ["Flat", "Flat", "Flat"])!;
  const texturedBlack = visualSeparation([["black"], ["black"], ["black"]], ["Cable knit", "Twill", "Flat"])!;
  expect(flatBlack).toBe(0);
  expect(texturedBlack).toBe(1);
});

test("value and texture are alternatives, not additives", () => {
  // An outfit already separated by value gains nothing from also being textured
  // — a sum would double-count it and outrank a genuinely better look.
  const byValue = visualSeparation([["navy"], ["white"], ["white"]], ["Flat", "Flat", "Flat"])!;
  const both = visualSeparation([["navy"], ["white"], ["white"]], ["Cable knit", "Twill", "Flat"])!;
  expect(byValue).toBe(1);
  expect(both).toBe(1);
});

test("the muddy trio is not rescued by flat surfaces", () => {
  expect(visualSeparation([["camel"], ["beige"], ["camel"]], ["Flat", "Flat", "Flat"])).toBeLessThan(0.5);
});
