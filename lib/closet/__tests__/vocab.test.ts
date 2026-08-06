import { readFileSync } from "node:fs";
import {
  CATEGORIES,
  SEASONS,
  FORMALITY_LABEL,
  MATERIALS,
  TEXTURES,
  PATTERNS,
  COLORS,
  COLOR_NAMES,
  colorHex,
} from "../vocab";
import { TagSchema } from "@/lib/ai/tagging-schema";

test("categories and seasons are derived from TagSchema, so they can never drift", () => {
  expect(CATEGORIES).toEqual(TagSchema.shape.category.options);
  expect(SEASONS).toEqual(TagSchema.shape.seasons.element.options);
});

test("formality labels cover 1..5 with a blank zero slot", () => {
  expect(FORMALITY_LABEL).toHaveLength(6);
  expect(FORMALITY_LABEL[0]).toBe("");
  expect(FORMALITY_LABEL[3]).toBe("Smart casual");
});

test("patterns match what the tagger emits", () => {
  expect(PATTERNS).toEqual(["solid", "striped", "check", "print", "other"]);
});

test("textures name knit structure, which material cannot express", () => {
  expect(TEXTURES).toEqual(expect.arrayContaining(["Ribbed", "Cable knit", "Waffle", "Brushed"]));
  // A texture is never a material and vice versa — overlapping the two lists
  // would make the tagger's choice ambiguous. "Other" is the deliberate
  // exception: both lists need their own escape hatch, and a structured-output
  // call with no way to say "none of these" returns a confident wrong answer.
  const overlap = (TEXTURES as readonly string[]).filter((t) =>
    (MATERIALS as readonly string[]).includes(t),
  );
  expect(overlap).toEqual(["Other"]);
});

test("both vocabularies have an escape hatch", () => {
  // A required z.enum with no "Other" forces the model to mislabel rather than
  // admit it cannot tell. TEXTURES originally had none.
  expect(MATERIALS).toContain("Other");
  expect(TEXTURES).toContain("Other");
});

test("the materials the generator's heat rule names all exist in the vocabulary", () => {
  // `HOT_MATERIALS` in lib/generator/rules.ts is matched against `material`.
  // Once material is a constrained enum, any term missing from this list
  // silently stops matching — which is how the rule half-broke before.
  // `quilted` is deliberately absent: it is a TEXTURE, and the heat rule must
  // read texture for it (see item-signals-in-generator, queue #12).
  for (const m of ["Fleece", "Shearling", "Down", "Tweed"]) expect(MATERIALS).toContain(m);
  expect(TEXTURES).toContain("Quilted");
});

test("every colour has a hex a swatch can render", () => {
  for (const c of COLORS) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
  expect(colorHex("navy")).toBeDefined();
  expect(colorHex("NAVY")).toBe(colorHex("navy")); // case-insensitive
  expect(colorHex("not-a-colour")).toBeUndefined();
});

test("the closet vocabulary lives ONLY in vocab.ts", () => {
  // Guards the drift BUGS.md #14 recorded: MATERIALS/CATEGORIES/SEASONS were
  // copy-pasted into both edit screens and neither copy matched the tagger, so
  // the AI could write a material the user could not choose back.
  for (const f of ["components/capture/confirm-form.tsx", "components/closet/item-detail.tsx"]) {
    const src = readFileSync(f, "utf8");
    expect(src, f).not.toMatch(/const\s+(MATERIALS|CATEGORIES|SEASONS|FORMALITY_LABEL)\s*[:=]/);
  }
});

test("the palette and the schema's enum are the same list", () => {
  // COLORS carries the hex and the neutral flag; COLOR_NAMES is what the model
  // is constrained to. Adding a colour to one and not the other would let the
  // tagger emit something with no swatch, or offer a swatch the tagger can
  // never produce — the exact drift this module exists to prevent.
  expect(COLORS.map((c) => c.name).sort()).toEqual([...COLOR_NAMES].sort());
});

test("every palette colour declares whether it is neutral", () => {
  for (const c of COLORS) expect(typeof c.neutral).toBe("boolean");
});
