import { metalTone, isHardware } from "../metal";

test("a steel watch is cool hardware", () => {
  expect(metalTone("Stainless steel", ["silver"])).toBe("cool");
  expect(isHardware("Stainless steel", ["silver"])).toBe(true);
});

test("gold is warm, by material even when the colour says nothing", () => {
  expect(metalTone("Gold", ["gold"])).toBe("warm");
  expect(metalTone("Gold", [])).toBe("warm");
});

test("blackened metal is its own family — streetwear hardware, not cool steel", () => {
  expect(metalTone("Stainless steel", ["black"])).toBe("dark");
  expect(metalTone("Stainless steel", ["charcoal"])).toBe("dark");
});

// ⚠️ The distinction the whole file turns on. Gating on the COLOUR would make
// both of these hardware and quietly remove a real garment colour from the
// three-colour ceiling.
test("a SILVER GARMENT is not hardware — the material decides, not the colour", () => {
  expect(metalTone("Polyester", ["silver"])).toBeNull();
  expect(metalTone("Leather", ["gold"])).toBeNull();
  expect(isHardware("Polyester", ["silver"])).toBe(false);
});

test("ordinary cloth is never hardware", () => {
  for (const m of ["Cotton", "Wool", "Denim", "Leather", "Canvas", "Nylon", "Other"]) {
    expect(metalTone(m, ["navy"])).toBeNull();
  }
});

test("a missing material is not hardware", () => {
  expect(metalTone(null, ["silver"])).toBeNull();
  expect(metalTone(undefined, ["silver"])).toBeNull();
});

test("material matching ignores case and padding, as the tagger is free text-ish", () => {
  expect(metalTone("  stainless steel  ", ["Silver"])).toBe("cool");
});
