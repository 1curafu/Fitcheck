import { bagCoordination } from "../bag";

const p = (category: string, colors: string[], over: object = {}) => ({ category, colors, ...over });
const base = [p("Tops", ["white"]), p("Bottoms", ["camel"]), p("Shoes", ["white"])];

test("no bag, no opinion", () => {
  expect(bagCoordination(base)).toBeNull();
});

test("ECHO — a bag that repeats the lower's colour family is deliberate coordination", () => {
  // The carried-forward criterion from the bags plan: this bag must be PREFERRED.
  expect(bagCoordination([...base, p("Bags", ["camel"])])).toBe(1);
});

test("echo is by family, not exact name — tan reads as camel", () => {
  expect(bagCoordination([...base, p("Bags", ["tan"])])).toBe(1);
});

test("echo may connect to the shoes, the outerwear, or a belt", () => {
  const brownShoes = [p("Tops", ["white"]), p("Bottoms", ["navy"]), p("Shoes", ["brown"])];
  expect(bagCoordination([...brownShoes, p("Bags", ["chocolate"])])).toBe(1);
  const camelCoat = [...brownShoes, p("Outerwear", ["camel"])];
  expect(bagCoordination([...camelCoat, p("Bags", ["tan"])])).toBe(1);
  const belt = [...brownShoes, p("Accessories", ["burgundy"], { subcategory: "Leather belt" })];
  expect(bagCoordination([...belt, p("Bags", ["burgundy"])])).toBe(1);
});

test("a black bag on a neutral outfit is fine, and less than an echo", () => {
  // "Exact shoe–bag matching is safe but not mandatory." It matches nothing
  // here, so it is not coordinated; it is also not wrong.
  const v = bagCoordination([...base, p("Bags", ["black"])])!;
  expect(v).toBeGreaterThan(0.5);
  expect(v).toBeLessThan(1);
});

test("BLEND — a neutral bag lets a statement elsewhere lead", () => {
  const statement = [p("Tops", ["white"]), p("Bottoms", ["navy"]), p("Shoes", ["rust"])];
  const blend = bagCoordination([...statement, p("Bags", ["black"])])!;
  const plain = bagCoordination([...base, p("Bags", ["black"])])!;
  expect(blend).toBeGreaterThan(plain);
});

test("CONTRAST — a coloured bag is the one focal point on a neutral outfit", () => {
  const v = bagCoordination([...base, p("Bags", ["burgundy"])])!;
  expect(v).toBeGreaterThan(0.5);
  expect(v).toBeLessThan(1);
});

test("CLUTTER — a second unrelated statement is the worst outcome", () => {
  const statement = [p("Tops", ["white"]), p("Bottoms", ["navy"]), p("Shoes", ["rust"])];
  const clutter = bagCoordination([...statement, p("Bags", ["forest"])])!;
  const contrast = bagCoordination([...base, p("Bags", ["burgundy"])])!;
  expect(clutter).toBeLessThan(contrast);
  expect(clutter).toBeLessThan(0.5);
});

test("the bag's dominant colour is judged, never its hardware", () => {
  // Hardware is metal.ts's business. A brass clasp must not make a black bag "echo" a camel trouser.
  expect(bagCoordination([...base, p("Bags", ["black"], { accent_color: "gold" })])).toBe(
    bagCoordination([...base, p("Bags", ["black"])]),
  );
});

test("echo works for loud colours too, not only the neutrals the trio map started with", () => {
  const rustShoes = [p("Tops", ["white"]), p("Bottoms", ["navy"]), p("Shoes", ["rust"])];
  expect(bagCoordination([...rustShoes, p("Bags", ["rust"])])).toBe(1);
  // Same family, different name: terracotta reads as rust.
  expect(bagCoordination([...rustShoes, p("Bags", ["terracotta"])])).toBe(1);
  const forestCoat = [p("Tops", ["white"]), p("Bottoms", ["navy"]), p("Shoes", ["brown"]), p("Outerwear", ["forest"])];
  expect(bagCoordination([...forestCoat, p("Bags", ["sage"])])).toBe(1);
});
