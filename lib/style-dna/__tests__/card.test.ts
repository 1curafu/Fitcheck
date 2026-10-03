import { readFileSync } from "node:fs";
import enUS from "@/messages/en-US.json";
import enGB from "@/messages/en-GB.json";
import uk from "@/messages/uk.json";
import ru from "@/messages/ru.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import it from "@/messages/it.json";
import pt from "@/messages/pt.json";
import es from "@/messages/es.json";
import nl from "@/messages/nl.json";
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
  expect(long.blurb.lines.length).toBeLessThanOrEqual(4);
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

test("sections stack top to bottom inside the frame, and the rows are evenly spaced", () => {
  const l = layoutDnaCard(input(), measure);
  const downwards = [l.mark.y, l.label.y, l.title.y, l.blurb.y, l.swatches[0].y, l.stats[0].y, l.divider, l.footer.y];
  expect(downwards).toEqual([...downwards].sort((a, b) => a - b));
  expect(new Set(downwards).size).toBe(downwards.length);
  expect(l.frame.y).toBeLessThan(l.mark.y);
  expect(l.frame.y + l.frame.h).toBeGreaterThan(l.footer.y);
  expect(l.frame.x + l.frame.w).toBeLessThanOrEqual(DNA_CARD.w);
  const pitches = l.swatches.slice(1).map((s, i) => s.x - l.swatches[i].x);
  expect(new Set(pitches).size).toBe(1);
  expect(l.swatches[0].x).toBe(96);
  expect(l.swatches.every((s) => s.w > 0 && s.labelY > s.y + s.h)).toBe(true);
  expect(l.stats.map((s) => s.x)).toEqual([96, 96 + 296, 96 + 592]);
  expect(l.stats.every((s) => s.labelY > s.y)).toBe(true);
  expect(l.wordmark.x).toBeGreaterThan(l.mark.x);
  expect(l.kicker.x).toBe(DNA_CARD.w - 96);
  expect(l.title.lineHeight).toBeGreaterThan(l.title.font.size);
  expect(l.blurb.lineHeight).toBeGreaterThan(l.blurb.font.size);
});

test("a single word wider than the card still shrinks the title to its smallest size", () => {
  const l = layoutDnaCard(input({ archetype: "Донеприсвійноісторичний" }), (text, font) => text.length * font.size * 0.9);
  expect(l.title.font.size).toBe(84);
});

test("the card sits centred in the story safe area, not hugging the top", () => {
  const l = layoutDnaCard(input(), measure);
  const above = l.frame.y - STORY_SAFE.top;
  const below = STORY_SAFE.bottom - (l.frame.y + l.frame.h);
  expect(above).toBeGreaterThanOrEqual(0);
  expect(below).toBeGreaterThanOrEqual(0);
  expect(Math.abs(above - below)).toBeLessThanOrEqual(1);
});

test("every language's blurb fits the card untruncated, whatever the style and tendencies (conservative measure)", () => {
  // 0.56em per character is wider than Libre Caslon italic or its Cyrillic fallback really are, so a pass here is safe.
  const wide = (text: string, font: FontSpec) => text.length * font.size * 0.56;
  type Copy = { styleDna: { opening?: Record<string, string>; trait?: Record<string, string> } };
  const catalogues = { "en-US": enUS, "en-GB": enGB, uk, ru, de, fr, it, pt, es, nl } as unknown as Record<string, Copy>;
  const source = enUS.styleDna as { opening: Record<string, string>; trait: Record<string, string> };
  const openings = ["oldMoney", "preppy", "streetwear", "smartCasual", "fresh"];
  const traits = ["tonal", "mixed", "colourful"].flatMap((tone) => ["Tailored", "Relaxed", "Balanced"].map((cut) => `${tone}${cut}`));
  const truncated: string[] = [];
  for (const [locale, messages] of Object.entries(catalogues)) {
    const own = messages.styleDna;
    for (const o of openings) for (const t of traits) {
      const blurb = `${own.opening?.[o] ?? source.opening[o]} ${own.trait?.[t] ?? source.trait[t]}`;
      const { blurb: laid } = layoutDnaCard(input({ blurb }), wide);
      if (laid.lines.at(-1)!.endsWith("…")) truncated.push(`${locale} ${o}+${t}`);
    }
  }
  expect(truncated).toEqual([]);
});
