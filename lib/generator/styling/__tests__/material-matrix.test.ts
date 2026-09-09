import { MATERIALS, TEXTURES } from "@/lib/ai/tagging-schema";
import {
  MATERIAL_PAIRINGS, TEXTURE_PAIRINGS,
  materialPairing, texturePairing, materialScore, textureScore, pairingReasons,
} from "../material-matrix";

test("linen against a winter fabric is a season conflict, rated low", () => {
  const p = materialPairing("Linen", "Fleece")!;
  expect(p.rating).toBeLessThanOrEqual(1);
  expect(p.codes).toContain("SEA");
});

test("a deliberate soft-vs-rugged contrast is a positive, not a clash", () => {
  const p = materialPairing("Silk", "Leather")!;
  expect(p.rating).toBeGreaterThanOrEqual(4);
  expect(p.codes).toContain("CPX");
});

test("cashmere + nylon outranks the other technical pairings", () => {
  // The one with real trend-press backing ("quiet outdoor"), deliberately above
  // wool+nylon and tweed+nylon.
  expect(materialPairing("Cashmere", "Nylon")!.rating).toBeGreaterThan(
    materialPairing("Tweed", "Nylon")!.rating,
  );
  expect(materialPairing("Cashmere", "Nylon")!.rating).toBeGreaterThan(
    materialPairing("Wool", "Nylon")!.rating,
  );
});

test("two bulky knits compound and are rated down", () => {
  expect(texturePairing("Chunky knit", "Chunky knit")!.rating).toBeLessThanOrEqual(1);
});

test("⚠️ a repeated texture REACHES the score — it is not de-duplicated away", () => {
  // The plan specified de-duplication, which would have made the same-value rows
  // unreachable through this function: rules that can never fire. The caller
  // passes one value per GARMENT, so two chunky knits are a real pair.
  const twoChunky = textureScore(["Chunky knit", "Chunky knit"])!;
  const chunkyAndFlat = textureScore(["Chunky knit", "Flat"]);
  expect(twoChunky).toBeLessThanOrEqual(0.2);
  // Chunky+Flat is unrated, so it drops out rather than scoring a midpoint.
  expect(chunkyAndFlat).toBeNull();
});

test("a quilted outer wants a fine knit under it, not a chunky one", () => {
  expect(texturePairing("Quilted", "Fine knit")!.rating).toBeGreaterThan(
    texturePairing("Quilted", "Chunky knit")!.rating,
  );
});

test("matrices are direction-agnostic", () => {
  expect(materialPairing("Denim", "Fleece")).toEqual(materialPairing("Fleece", "Denim"));
  expect(texturePairing("Flat", "Twill")).toEqual(texturePairing("Twill", "Flat"));
});

test("every key names a real vocabulary value", () => {
  // ⚠️ A key naming a material the tagger cannot emit is a rule that can never
  // fire — the unreachable-list trap this codebase has hit before.
  for (const k of Object.keys(MATERIAL_PAIRINGS)) {
    for (const name of k.split("|")) expect(MATERIALS).toContain(name);
  }
  for (const k of Object.keys(TEXTURE_PAIRINGS)) {
    for (const name of k.split("|")) expect(TEXTURES).toContain(name);
  }
});

test("an unrated pair is null, not a made-up midpoint", () => {
  expect(materialPairing("Modal", "Gold")).toBeNull();
  expect(materialScore(["Gold"])).toBeNull();
  expect(materialScore([])).toBeNull();
  expect(materialScore([null, undefined])).toBeNull();
});

test("scores normalise to 0..1", () => {
  expect(materialScore(["Silk", "Leather"])!).toBeGreaterThan(0.7);
  expect(materialScore(["Linen", "Fleece"])!).toBeLessThan(0.3);
  expect(textureScore(["Waffle", "Ribbed"])!).toBeGreaterThan(0.7);
});

test("reason codes travel with the score", () => {
  // What lets the why-sentence say "linen and fleece contradict each other
  // climatically" rather than "rated 1".
  expect(pairingReasons(["Linen", "Fleece"], [])).toContain("SEA");
  expect(pairingReasons(["Silk", "Leather"], [])).toContain("CPX");
  expect(pairingReasons([], ["Chunky knit", "Chunky knit"])).toContain("WT");
  expect(pairingReasons(["Cotton"], ["Flat"])).toEqual([]);
});
