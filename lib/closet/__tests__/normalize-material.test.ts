import { normalizeMaterial } from "../normalize-material";

test("maps legacy free text onto the vocabulary, case-insensitively", () => {
  expect(normalizeMaterial("cotton")).toBe("Cotton");
  expect(normalizeMaterial("MERINO WOOL")).toBe("Merino wool");
});

test("prefers the most specific match — 'merino wool' is not plain 'Wool'", () => {
  expect(normalizeMaterial("merino wool blend")).toBe("Merino wool");
});

test("'faux leather' is not plain 'Leather'", () => {
  // Same longest-match-first rule; getting this backwards would make every
  // vegan piece claim to be leather.
  expect(normalizeMaterial("faux leather")).toBe("Faux leather");
});

test("the fabrication written by the old save path becomes null, not a material", () => {
  // item-detail.tsx used to write the literal string "Unknown".
  expect(normalizeMaterial("Unknown")).toBeNull();
});

test("anything unrecognised falls back to Other rather than being dropped", () => {
  expect(normalizeMaterial("bamboo jersey")).toBe("Other");
  expect(normalizeMaterial(null)).toBeNull();
});

test("the real legacy values in this database all resolve", () => {
  // Dumped from the development closet before the migration.
  const legacy: Record<string, string> = {
    cotton: "Cotton",
    Cotton: "Cotton",
    "Cotton knit": "Cotton",
    knit: "Other",
    leather: "Leather",
    Linen: "Linen",
    Lyocell: "Lyocell",
    "Polyester, Viscose": "Polyester",
    Viscose: "Viscose",
    Wool: "Wool",
  };
  for (const [raw, want] of Object.entries(legacy)) {
    expect(normalizeMaterial(raw), raw).toBe(want);
  }
});
