import { weatherRules, type Weather } from "./rules";

export type CandidateItem = {
  id: string;
  category: string; // DB TitleCase: Tops/Bottoms/Outerwear/Shoes/Accessories/Fragrance
  colors: string[];
  formality: number | null;
  seasons: string[];
  material: string | null;
};

export type CandidateArgs = {
  band: [number, number];
  weather: Weather;
  season: string;
  excludeItemIds: string[];
  mustColors: string[];
  maxAccessories: number;
};

const CAP = 200;

export function buildCandidates(items: CandidateItem[], a: CandidateArgs): CandidateItem[][] {
  const [lo, hi] = a.band;
  const { needsOuterwear, excludeMaterials } = weatherRules(a.weather);

  const eligible = items.filter((i) => {
    if (i.category === "Fragrance") return false; // D11: fragrances are never slotted
    if (a.excludeItemIds.includes(i.id)) return false;
    if (i.material && excludeMaterials.includes(i.material.toLowerCase())) return false;
    if (i.seasons.length && !i.seasons.includes(a.season)) return false;
    const f = i.formality ?? 3;
    return f >= lo - 0.5 && f <= hi + 0.5;
  });

  const byCat = (c: string) => eligible.filter((i) => i.category === c);
  const tops = byCat("Tops");
  const bottoms = byCat("Bottoms");
  const shoes = byCat("Shoes");
  const outer = byCat("Outerwear");
  const accessories = byCat("Accessories");

  const combos: CandidateItem[][] = [];
  for (const t of tops)
    for (const b of bottoms)
      for (const s of shoes) {
        let base = [t, b, s];
        if (needsOuterwear) {
          if (!outer.length) continue; // cold but nothing to layer → can't satisfy
          base = [...base, outer[0]];
        }
        combos.push(base); // required base (± outerwear), no accessory
        if (a.maxAccessories > 0 && accessories.length) {
          combos.push([...base, accessories[0]]); // optional, capped accent
        }
      }

  const filtered = a.mustColors.length
    ? combos.filter((c) => a.mustColors.every((mc) => c.some((i) => i.colors.includes(mc))))
    : combos;

  return filtered.slice(0, CAP);
}
