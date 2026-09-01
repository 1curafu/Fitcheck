import { goesWith } from "../goes-with";

const subject = { id: "s", category: "Tops", colors: ["cream"], formality: 3 };
const closet = [
  { id: "a", category: "Bottoms", colors: ["navy"], formality: 3 }, // harmonious, close formality
  { id: "b", category: "Bottoms", colors: ["rust"], formality: 1 }, // clashing, far formality
  { id: "c", category: "Tops", colors: ["navy"], formality: 3 }, // same category
  { id: "s", category: "Tops", colors: ["cream"], formality: 3 }, // itself
];

test("a harmonious, formality-close piece ranks first", () => {
  expect(goesWith(subject, closet)[0]).toBe("a");
});

test("the subject never suggests itself", () => {
  expect(goesWith(subject, closet)).not.toContain("s");
});

test("same-category pieces are excluded — a shirt does not go with a shirt", () => {
  expect(goesWith(subject, closet)).not.toContain("c");
});

test("returns at most n", () => {
  expect(goesWith(subject, closet, 1)).toHaveLength(1);
});

test("a closet with nothing else returns empty rather than throwing", () => {
  expect(goesWith(subject, [subject], 5)).toEqual([]);
});

test("fragrances are never suggested — they are not slotted anywhere", () => {
  const withFragrance = [...closet, { id: "f", category: "Fragrance", colors: [], formality: 3 }];
  expect(goesWith(subject, withFragrance)).not.toContain("f");
});

// An untagged formality must not read as "maximally different from everything",
// which would bury every unfinished item at the bottom of the row forever.
test("a missing formality is treated as mid-scale, not as a mismatch", () => {
  const untagged = { id: "u", category: "Bottoms", colors: ["navy"], formality: null };
  const formal = { id: "v", category: "Bottoms", colors: ["navy"], formality: 5 };
  const ranked = goesWith(subject, [untagged, formal]);
  expect(ranked[0]).toBe("u");
});

// colorHarmonyScore used to count accent OCCURRENCES rather than distinct
// accents, so a candidate that echoed the subject's own accent was charged the
// same 0.25 "second accent" penalty as a candidate that introduced a brand-new
// one — a colour echo, the most reliable move in styling, scored no better
// than a genuine clash. Pinned here at the goesWith call site (not just in
// colorHarmonyScore's own unit tests) because this is a real caller whose
// fixtures never previously exercised a repeated accent.
test("a candidate that echoes the subject's accent outranks one that adds a new accent", () => {
  const echoSubject = { id: "s2", category: "Tops", colors: ["sky"], formality: 3 };
  const echoCloset = [
    // Echoes the subject's own accent (sky) — under distinct-accent counting
    // this is still a single accent in play, so harmony stays at 1.0.
    { id: "echo", category: "Bottoms", colors: ["sky"], formality: 3 },
    // Introduces a second, different accent (rust) — two distinct accents,
    // so harmony drops to 0.75. formality is identical to "echo" above, so
    // the only thing that can separate them is the harmony term.
    { id: "newaccent", category: "Bottoms", colors: ["rust"], formality: 3 },
  ];
  const ranked = goesWith(echoSubject, echoCloset);
  expect(ranked[0]).toBe("echo");
});

// The row is a suggestion, not a ranking of the whole closet — five is what the
// design's scrolling row shows.
test("defaults to five suggestions", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `x${i}`,
    category: "Bottoms",
    colors: ["navy"],
    formality: 3,
  }));
  expect(goesWith(subject, many)).toHaveLength(5);
});
