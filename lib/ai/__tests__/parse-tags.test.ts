import { parseTagText, tagsToItemRow } from "../parse-tags";

const valid = JSON.stringify({
  category: "Bottoms",
  subcategory: "chinos",
  colors: ["beige"],
  pattern: "solid",
  material: "cotton",
  formality: 3,
  seasons: ["Spring"],
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
    formality: 3,
  });
});
