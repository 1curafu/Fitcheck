import { metalTone, isHardware, accentMetalTone, metalCoordination } from "../metal";

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

// ---------------------------------------------------------------------------
// Accents are metal too — a buckle, a zip, a clasp.
// ---------------------------------------------------------------------------

test("a silver accent is cool hardware, a gold one warm", () => {
  expect(accentMetalTone("silver")).toBe("cool");
  expect(accentMetalTone("gold")).toBe("warm");
});

test("an ordinary accent colour is not metal", () => {
  for (const c of ["navy", "sky", "rust", "white", null, undefined]) {
    expect(accentMetalTone(c)).toBeNull();
  }
});

// ⚠️ The asymmetry with `metalTone` is deliberate: an accent IS the small
// hardware detail, so its colour is enough; an item's body needs the material.
test("a silver LEATHER bag is not metal, but its silver accent is", () => {
  expect(metalTone("Faux leather", ["silver"])).toBeNull();
  expect(accentMetalTone("silver")).toBe("cool");
});

// ---------------------------------------------------------------------------
// metalCoordination
// ---------------------------------------------------------------------------

const steelWatch = { material: "Stainless steel", colors: ["silver"] };
const silverChain = { material: "Silver", colors: ["silver"] };
const goldRing = { material: "Gold", colors: ["gold"] };
const bagSilverBuckle = { material: "Faux leather", colors: ["black"], accent_color: "silver" };
const shirt = { material: "Cotton", colors: ["white"] };

test("no evidence returns null, never 0.5 — one metal cannot coordinate with itself", () => {
  expect(metalCoordination([shirt, shirt])).toBeNull();
  expect(metalCoordination([shirt, steelWatch])).toBeNull();
  expect(metalCoordination([])).toBeNull();
});

test("one visible metal family is the safe default", () => {
  expect(metalCoordination([steelWatch, silverChain])).toBe(1);
  // The case task 1 broke: a bag's buckle and a steel watch are one cool system.
  expect(metalCoordination([bagSilverBuckle, steelWatch])).toBe(1);
});

test("a controlled mix scores above a scramble, and both below one family", () => {
  const dominant = metalCoordination([steelWatch, silverChain, silverChain, goldRing])!;
  const evenSplit = metalCoordination([steelWatch, goldRing])!;
  expect(dominant).toBeGreaterThan(evenSplit);
  expect(dominant).toBeLessThan(metalCoordination([steelWatch, silverChain])!);
});

test("an item carrying two metals counts as two elements", () => {
  // A steel watch with a gold bezel — the research's "two-tone watch connects
  // both metals".
  const twoTone = { material: "Stainless steel", colors: ["silver"], accent_color: "gold" };
  expect(metalCoordination([twoTone])).not.toBeNull();
});
