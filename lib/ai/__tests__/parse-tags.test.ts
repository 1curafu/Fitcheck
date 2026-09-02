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
