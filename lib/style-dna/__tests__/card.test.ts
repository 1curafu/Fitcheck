import { readFileSync } from "node:fs";
import { STORY_SAFE, type FontSpec } from "@/lib/share/card-layout";
import { DNA_CARD, layoutDnaCard, type DnaCardInput } from "../card";

const measure = (text: string, font: FontSpec) => text.length * font.size * 0.52;
const input = (over: Partial<DnaCardInput> = {}): DnaCardInput => ({
  kicker: "Style DNA", label: "Your archetype", archetype: "Old Money", blurb: "Quiet heritage, worn with ease. You lean tonal and favour a tailored cut.",
  swatches: ["#141414", "#8a8a8f", "#f4f1ea", "#2c3a4c", "#b89a6a"].map((hex, i) => ({ hex, label: `colour ${i}` })),
  stats: [{ value: "19", label: "Pieces" }, { value: "42", label: "Looks worn" }, { value: "62%", label: "Everyday" }],
  footer: "19 pieces analysed", ...over,
});

test("everything sits inside the story safe area, even with long text", () => {
  const long = layoutDnaCard(input({
    archetype: "Повсякденно-елегантний стиль",
    blurb: "Полірований і легкий, без зайвих зусиль. Ти обираєш нейтральні тони з дрібкою кольору й поєднуєш чіткі лінії з вільними.",
  }), measure);
  const ys = [long.label.y, long.title.y + long.title.lineHeight * long.title.lines.length, long.blurb.y + long.blurb.lineHeight * long.blurb.lines.length,
    ...long.swatches.map((s) => s.labelY), ...long.stats.map((s) => s.labelY), long.footer.y];
  for (const y of ys) {
    expect(y).toBeGreaterThan(STORY_SAFE.top);
    expect(y).toBeLessThan(STORY_SAFE.bottom);
  }
  expect(long.title.lines.length).toBeLessThanOrEqual(2);
  expect(long.blurb.lines.length).toBeLessThanOrEqual(3);
  expect(long.title.font.size).toBeLessThan(132); // the long word forced a smaller size
});

test("one to five swatches share the row without overflowing it", () => {
  for (const count of [1, 3, 5]) {
    const layout = layoutDnaCard(input({ swatches: input().swatches.slice(0, count) }), measure);
    expect(layout.swatches).toHaveLength(count);
    const last = layout.swatches[count - 1];
    expect(last.x + last.w).toBeLessThanOrEqual(DNA_CARD.w - 96);
  }
});

test("the card input carries no photo, piece name, user name or handle (spec D6)", () => {
  const source = readFileSync("lib/style-dna/card.ts", "utf8");
  const type = source.slice(source.indexOf("export type DnaCardInput"), source.indexOf("};", source.indexOf("export type DnaCardInput")));
  expect(type).not.toMatch(/image|url|photo|name|handle|piece/i);
});
