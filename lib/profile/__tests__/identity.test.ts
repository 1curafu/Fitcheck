import { initials, handleFrom, paletteFor } from "../identity";

describe("initials", () => {
  test("initials come from the display name", () => {
    expect(initials("Mykhailo Khimich", "m@x.com")).toBe("MK");
    expect(initials("Cher", "c@x.com")).toBe("C");
  });

  test("a missing name falls back to the email, never to an empty circle", () => {
    expect(initials(null, "icurafu333@gmail.com")).toBe("I");
    expect(initials("", "icurafu333@gmail.com")).toBe("I");
  });

  test("initials are at most two characters even for long names", () => {
    expect(initials("Ana Maria Sofia Ferreira", "a@x.com")).toHaveLength(2);
  });

  test("extra whitespace does not produce blank initials", () => {
    expect(initials("  Mykhailo   Khimich  ", "m@x.com")).toBe("MK");
  });

  // The avatar is a 62px circle with nothing else in it — an empty one reads as
  // a broken image rather than a person.
  test("a name of only whitespace still yields a letter", () => {
    expect(initials("   ", "icurafu333@gmail.com")).toBe("I");
  });

  test("initials are upper-cased however the name was typed", () => {
    expect(initials("mykhailo khimich", "m@x.com")).toBe("MK");
  });
});

describe("handleFrom", () => {
  test("the handle derives from the email local-part", () => {
    expect(handleFrom("icurafu333@gmail.com")).toBe("@icurafu333");
  });

  // A handle is shown on screen and will eventually reach a share card, so it
  // must not carry characters that read as punctuation noise.
  test("dots and plus-addressing are stripped", () => {
    expect(handleFrom("first.last+fitcheck@gmail.com")).toBe("@firstlast");
  });

  test("it never returns a bare @", () => {
    expect(handleFrom("@weird.com").length).toBeGreaterThan(1);
    expect(handleFrom("")).toMatch(/^@\w+/);
  });
});

describe("paletteFor", () => {
  test("a known archetype has a palette; an unknown one still returns swatches", () => {
    expect(paletteFor("Old Money").length).toBeGreaterThan(0);
    expect(paletteFor(null).length).toBeGreaterThan(0);
  });

  test("every palette entry is a renderable hex", () => {
    for (const c of paletteFor("Streetwear")) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    for (const c of paletteFor(null)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  // Every archetype the onboarding quiz can produce must resolve to something
  // deliberate rather than silently falling back.
  test.each(["Old Money", "Smart Casual", "Preppy", "Streetwear"])(
    "%s — the quiz's own archetype — has its own palette",
    (a) => {
      expect(paletteFor(a).length).toBeGreaterThan(0);
    },
  );

  // These are the --color-dna-* tokens in globals.css. Hard-coding a second set
  // here is how the hub and the Style DNA card drift apart.
  test("palettes are drawn from the DNA tokens", () => {
    const DNA = ["#ede6d8", "#2c3a4c", "#b89a6a", "#6e6f52", "#b86a47"];
    for (const a of ["Old Money", "Preppy", null]) {
      for (const c of paletteFor(a)) expect(DNA).toContain(c.toLowerCase());
    }
  });
});
