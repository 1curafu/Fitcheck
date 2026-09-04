import { parseTagText, tagsToItemRow } from "../parse-tags";
import { TagSchema } from "../tagging-schema";

const valid = JSON.stringify({
  category: "Bottoms",
  subcategory: "chinos",
  colors: ["beige"],
  pattern: "solid",
  material: "Cotton",
  texture: "Twill",
  formality: 3,
  seasons: ["Spring"],
  accent_color: "sky",
  branding: "Small",
  fit: null,
  length: "Ankle",
  bulk: null,
  distressing: "None",
});

test("parseTagText returns validated tags", () => {
  expect(parseTagText(valid).category).toBe("Bottoms");
});

test("parseTagText throws on non-JSON", () => {
  expect(() => parseTagText("sorry, here are the tags:")).toThrow();
});

test("tagsToItemRow merges tags with ids + urls", () => {
  const row = tagsToItemRow({
    userId: "u1",
    imageUrl: "a.jpg",
    cutoutUrl: "b.png",
    tags: parseTagText(valid),
  });
  expect(row).toMatchObject({
    user_id: "u1",
    image_url: "a.jpg",
    cutout_url: "b.png",
    category: "Bottoms",
    colors: ["beige"],
    material: "Cotton",
    texture: "Twill",
    formality: 3,
  });
});

test("tagsToItemRow carries every new styling field into the row", () => {
  const row = tagsToItemRow({
    userId: "u1", imageUrl: "a.jpg", cutoutUrl: null,
    tags: TagSchema.parse(JSON.parse(valid)),
  });
  expect(row.accent_color).toBe("sky");
  expect(row.branding).toBe("Small");
  expect(row.fit).toBeNull();
  expect(row.length).toBe("Ankle");
  expect(row.bulk).toBeNull();
  expect(row.distressing).toBe("None");
});

// `distressing` doubles as the backfill script's "has this row been through
// the tagger" sentinel — see scripts/backfill-styling-tags.ts. A capture-path
// row must never land in the DB with a null distressing, or a freshly-tagged
// item reads as never-processed.
test("tagsToItemRow never emits a null distressing, even when the model returns null", () => {
  const tags = TagSchema.parse({ ...JSON.parse(valid), distressing: null });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.distressing).toBe("None");
});

// `bulk` is a footwear-only field. The prompt tells the model "FOOTWEAR
// ONLY", but a prompt is guidance, not an invariant — this pins the DB write
// itself, so a model that ignores the prompt can never persist a sole value
// on a non-Shoes item.
test("tagsToItemRow nulls bulk on a non-Shoes item even if the model returned one", () => {
  const tags = TagSchema.parse({ ...JSON.parse(valid), category: "Tops", bulk: "Chunky" });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.bulk).toBeNull();
});

// ── Task 3: fit_source — was `fit` answered by a human, or still a guess? ───

// `fit` is the one tag the USER answers: "oversized" is relative to a body a
// flat cutout does not contain. The confirm screen pre-selects the model's
// draft, so accepting it costs no taps — a value nobody looked at must not be
// stored identically to one somebody chose.
test("accepting the model's drafted fit is recorded as the model's, not the user's", () => {
  const row = tagsToItemRow({
    userId: "u1",
    imageUrl: "a.jpg",
    cutoutUrl: null,
    tags: { ...TagSchema.parse(JSON.parse(valid)), fit: "Relaxed" },
  });
  expect(row.fit_source).toBe("model");
});

test("a fit the user explicitly set stays attributed to the user", () => {
  const tags = TagSchema.parse({ ...JSON.parse(valid), fit: "Oversized", fit_source: "user" });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.fit_source).toBe("user");
});

// The model is never asked for fit_source (see tagging-schema.ts) — its real
// response omits the key entirely, unlike every fixture above which sets it
// to null explicitly.
test("parseTagText defaults fit_source to null when the model's response omits it", () => {
  const noFitSource = JSON.stringify({ ...JSON.parse(valid) });
  const parsedRaw = JSON.parse(noFitSource);
  delete parsedRaw.fit_source; // the fixture never had the key, but be explicit
  expect(parseTagText(JSON.stringify(parsedRaw)).fit_source).toBeNull();
});

// ── Task 5: fit and length are body-referenced — a shoe has neither ─────────

test("tagsToItemRow refuses a fit and length on a shoe even if the model returns them", () => {
  const tags = TagSchema.parse({
    ...JSON.parse(valid),
    category: "Shoes",
    fit: "Relaxed",
    length: "Hip",
  });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.fit).toBeNull();
  expect(row.length).toBeNull();
});

// A stale "user" on a fit the category can no longer have is exactly what
// fit_source exists to prevent — see the same guard on the write path for bulk.
test("tagsToItemRow also nulls fit_source when the category gate nulls fit", () => {
  const tags = TagSchema.parse({
    ...JSON.parse(valid),
    category: "Shoes",
    fit: "Relaxed",
    fit_source: "user",
    length: "Hip",
  });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.fit_source).toBeNull();
});

test("tagsToItemRow still carries fit and length on a wearable category", () => {
  const tags = TagSchema.parse({
    ...JSON.parse(valid),
    category: "Tops",
    fit: "Relaxed",
    fit_source: "user",
    length: "Hip",
  });
  const row = tagsToItemRow({ userId: "u1", imageUrl: "a.jpg", cutoutUrl: null, tags });
  expect(row.fit).toBe("Relaxed");
  expect(row.fit_source).toBe("user");
  expect(row.length).toBe("Hip");
});
