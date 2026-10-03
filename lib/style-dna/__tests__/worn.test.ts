import type { CandidateItem } from "@/lib/generator/candidates";
import { WEAR_MIN, dressy, formula, pairing, signature, statTrio, wornLooks, type WornLook } from "../worn";
import { buildStyleDna } from "..";

const piece = (id: string, category: string, extra: Partial<CandidateItem> = {}): CandidateItem => ({
  id, category, colors: ["navy"], formality: 3, seasons: [], material: "Cotton", texture: "Flat", pattern: "solid", ...extra,
});
const knit = piece("knit", "Tops", { subcategory: "Knit", colors: ["navy"], formality: 3 });
const chinos = piece("chinos", "Bottoms", { subcategory: "Chinos", colors: ["camel"], formality: 3 });
const loafers = piece("loafers", "Shoes", { subcategory: "Loafers", colors: ["brown"], formality: 4 });
const tee = piece("tee", "Tops", { subcategory: "T-shirt", colors: ["white"], formality: 2 });
const jeans = piece("jeans", "Bottoms", { subcategory: "Jeans", colors: ["denim"], formality: 2, material: "Denim" });
const closet = [knit, chinos, loafers, tee, jeans];
const look = (outfitId: string, wears: number, items: CandidateItem[], occasion: string | null = "everyday"): WornLook => ({ outfitId, occasion, wears, items });

describe("wornLooks", () => {
  test("joins logs to outfits and pieces, skipping vanished outfits and archived pieces", () => {
    const looks = wornLooks(closet,
      [{ outfit_id: "o1" }, { outfit_id: "o1" }, { outfit_id: "gone" }, { outfit_id: null }, { outfit_id: "o2" }, { outfit_id: "o3" }],
      [{ id: "o1", occasion: "work" }, { id: "o2", occasion: "weekend" }, { id: "o3", occasion: "evening" }],
      [{ outfit_id: "o1", item_id: "knit" }, { outfit_id: "o1", item_id: "chinos" }, { outfit_id: "o2", item_id: "archived-piece" },
        { outfit_id: "o3", item_id: "tee" }]);
    expect(looks.map((l) => [l.outfitId, l.wears, l.occasion, l.items.map((i) => i.id)])).toEqual([
      ["o1", 2, "work", ["knit", "chinos"]], ["o3", 1, "evening", ["tee"]],
    ]);
  });
});

test("the stat trio counts pieces, wears and the most-worn occasion", () => {
  const looks = [look("a", 3, [knit], "work"), look("b", 1, [tee], "weekend")];
  expect(statTrio(closet, looks)).toEqual({ pieces: 5, looksWorn: 4, occasion: { key: "work", share: 0.75 }, colours: 5 });
  expect(statTrio(closet, [])).toEqual({ pieces: 5, looksWorn: 0, occasion: null, colours: 5 });
});

describe("formula", () => {
  test("locked below WEAR_MIN wears", () => {
    expect(formula([look("a", WEAR_MIN - 1, [knit, chinos, loafers])])).toEqual({ status: "locked", have: WEAR_MIN - 1, need: WEAR_MIN });
  });

  test("the core kinds with the most wears", () => {
    expect(formula([look("a", 3, [knit, chinos, loafers]), look("b", 2, [tee, jeans, loafers]), look("c", 1, [knit, chinos, loafers])]))
      .toEqual({ status: "found", kinds: ["knit", "chinos", "loafers"], wears: 4 });
  });

  test("a formula needs two wears and a complete core", () => {
    expect(formula([look("a", 1, [knit, chinos, loafers]), look("b", 1, [tee, jeans, loafers]), look("c", 3, [knit, loafers])]))
      .toEqual({ status: "none" });
  });

  test("a dress look's core is dress + shoes", () => {
    const dress = piece("dress", "One-piece", { subcategory: "Wrap dress" });
    expect(formula([look("a", 5, [dress, loafers])])).toEqual({ status: "found", kinds: ["dress", "loafers"], wears: 5 });
  });
});

test("signature pieces: top three by wears, worn at least twice, ties by id", () => {
  const looks = [look("a", 3, [knit, chinos]), look("b", 2, [tee, chinos]), look("c", 1, [jeans])];
  expect(signature(looks)).toEqual({ status: "found", pieces: [{ id: "chinos", wears: 5 }, { id: "knit", wears: 3 }, { id: "tee", wears: 2 }] });
  expect(signature([look("a", 5, [piece("scent", "Fragrance")])])).toEqual({ status: "none" });
});

test("go-to colours: the pair with the most wears, with the sourced verdict", () => {
  expect(pairing([look("a", 4, [knit, chinos, loafers]), look("b", 1, [tee, jeans])])).toMatchObject({ status: "found", wears: 4 });
  const found = pairing([look("a", 5, [knit, chinos])]);
  expect(found).toEqual({ status: "found", colors: ["camel", "navy"], wears: 5, verdict: "classic" });
  expect(pairing([look("a", 5, [knit])])).toEqual({ status: "none" });
});

describe("dressy vs worn", () => {
  test("wear-weighted worn formality against owned formality", () => {
    const result = dressy(closet, [look("a", 5, [tee, jeans])]);
    expect(result).toEqual({ status: "found", owned: 2.8, worn: 2, verdict: "ownDressier" });
  });

  test("aligned within half a step", () => {
    expect(dressy(closet, [look("a", 5, [knit, chinos, loafers, tee, jeans])])).toMatchObject({ verdict: "aligned" });
  });

  test("locked below WEAR_MIN", () => {
    expect(dressy(closet, [look("a", 1, [tee])])).toEqual({ status: "locked", have: 1, need: WEAR_MIN });
  });
});

test("buildStyleDna is deterministic and complete for an empty closet", () => {
  const empty = buildStyleDna({ closet: [], quiz: { archetype: null, palette: null, fit: null }, logs: [], outfits: [], pieces: [] });
  expect(empty.reading).toEqual({ source: "quiz", archetype: null });
  expect(empty.trio).toEqual({ pieces: 0, looksWorn: 0, occasion: null, colours: 0 });
  expect(empty.formula).toEqual({ status: "locked", have: 0, need: WEAR_MIN });
  expect(JSON.stringify(empty)).not.toMatch(/NaN/);
  const input = { closet, quiz: { archetype: "Preppy", palette: "Neutrals", fit: "Tailored" }, logs: [], outfits: [], pieces: [] };
  expect(buildStyleDna(input)).toEqual(buildStyleDna(input));
});

describe("boundaries and ties pinned after the Stryker review", () => {
  const bag = piece("bag", "Bags", { colors: ["gold"], formality: 5 });

  test("a log for an outfit row that no longer exists is skipped even when its pieces survive", () => {
    const looks = wornLooks(closet, [{ outfit_id: "gone" }, { outfit_id: "o1" }], [{ id: "o1", occasion: "work" }],
      [{ outfit_id: "gone", item_id: "tee" }, { outfit_id: "o1", item_id: "knit" }]);
    expect(looks.map((l) => l.outfitId)).toEqual(["o1"]);
  });

  test("looks come back in outfit-id order, whatever order the logs arrived in", () => {
    const looks = wornLooks(closet, [{ outfit_id: "b" }, { outfit_id: "a" }], [{ id: "a", occasion: null }, { id: "b", occasion: null }],
      [{ outfit_id: "a", item_id: "knit" }, { outfit_id: "b", item_id: "tee" }]);
    expect(looks.map((l) => l.outfitId)).toEqual(["a", "b"]);
  });

  test("bags do not add to the colour count", () => {
    expect(statTrio([...closet, bag], []).colours).toBe(statTrio(closet, []).colours);
  });

  test("a formula needs exactly two wears; a tie goes to the alphabetically first formula", () => {
    expect(formula([look("a", 2, [knit, chinos, loafers]), look("b", 3, [knit, loafers])])).toEqual({ status: "found", kinds: ["knit", "chinos", "loafers"], wears: 2 });
    expect(formula([look("a", 3, [tee, jeans, loafers]), look("b", 3, [knit, chinos, loafers])]))
      .toEqual({ status: "found", kinds: ["knit", "chinos", "loafers"], wears: 3 });
  });

  test("a signature piece needs exactly two wears; ties go to the lower id", () => {
    expect(signature([look("a", 2, [knit]), look("b", 3, [tee])])).toEqual({ status: "found", pieces: [{ id: "tee", wears: 3 }, { id: "knit", wears: 2 }] });
    expect(signature([look("a", 5, [tee, knit])])).toEqual({ status: "found", pieces: [{ id: "knit", wears: 5 }, { id: "tee", wears: 5 }] });
    expect(signature([look("a", 1, [knit]), look("b", 4, [piece("scent", "Fragrance")])])).toEqual({ status: "none" });
  });

  test("a go-to pair needs exactly two wears and the verdict follows the sourced rating (4 classic, 3 good, else yours)", async () => {
    const { COLOR_NAMES } = await import("@/lib/closet/vocab");
    const { pairingRating } = await import("@/lib/generator/styling/pairing-ratings");
    const pairOf = (rating: number | null) => {
      for (const a of COLOR_NAMES) for (const b of COLOR_NAMES) if (a < b && pairingRating(a, b) === rating) return [a, b] as const;
      throw new Error(`no pair rated ${rating}`);
    };
    for (const [rating, verdict] of [[4, "classic"], [3, "good"], [null, "yours"]] as const) {
      const [a, b] = pairOf(rating);
      const items = [piece("x", "Tops", { colors: [a] }), piece("y", "Bottoms", { colors: [b] })];
      expect(pairing([look("a", 2, items), look("b", 3, [piece("z", "Tops", { colors: [a] })])])).toEqual({ status: "found", colors: [a, b], wears: 2, verdict });
    }
    expect(pairing([look("a", 1, [knit, chinos]), look("b", 4, [knit])])).toEqual({ status: "none" });
  });

  test("dressy vs worn: half a step either way already counts; bags and unknown formality are ignored", () => {
    const f = (id: string, formality: number) => piece(id, "Tops", { formality });
    const [two, three, four] = [f("t2", 2), f("t3", 3), f("t4", 4)];
    const owned = [two, three, four, bag];
    expect(dressy(owned, [look("a", 5, [two, three])])).toEqual({ status: "found", owned: 3, worn: 2.5, verdict: "ownDressier" });
    expect(dressy(owned, [look("a", 5, [three, four])])).toEqual({ status: "found", owned: 3, worn: 3.5, verdict: "wearDressier" });
    expect(dressy([piece("n", "Tops", { formality: null })], [look("a", 5, [three])])).toBeNull();
    expect(dressy(owned, [look("a", 5, [bag])])).toBeNull();
  });
});

describe("more pins from the Stryker review", () => {
  const bag = piece("bag", "Bags", { colors: ["gold"] });

  test("an undated look does not count towards the occasion share; an occasion tie goes alphabetically", () => {
    expect(statTrio(closet, [look("a", 3, [knit], "work"), look("b", 1, [tee], null)]).occasion).toEqual({ key: "work", share: 1 });
    expect(statTrio(closet, [look("a", 2, [knit], "work"), look("b", 2, [tee], "weekend")]).occasion).toEqual({ key: "weekend", share: 0.5 });
  });

  test("signature pieces and go-to colours are locked below WEAR_MIN wears", () => {
    expect(signature([look("a", 2, [knit])])).toEqual({ status: "locked", have: 2, need: WEAR_MIN });
    expect(pairing([look("a", 2, [knit, chinos])])).toEqual({ status: "locked", have: 2, need: WEAR_MIN });
  });

  test("signature pieces stop at three", () => {
    const four = ["a", "b", "c", "d"].map((id) => piece(id, "Tops"));
    expect(signature([look("x", 5, four)])).toMatchObject({ status: "found", pieces: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  });

  test("a bag's colour never forms a go-to pair", () => {
    expect(pairing([look("a", 5, [knit, bag])])).toEqual({ status: "none" });
  });
});
