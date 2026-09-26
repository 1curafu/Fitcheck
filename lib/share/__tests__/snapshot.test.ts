import { describe, expect, it } from "vitest";
import { isShareToken, isUuid, orderPieces, pieceLabel, shareExpiry, shareKicker, snapshotPieces } from "../snapshot";

const p = (id: string, category: string, name = id, brand: string | null = null) => ({ id, category, name, brand });

describe("orderPieces", () => {
  it("puts garments in reading order, then the rest", () => {
    const out = orderPieces([p("a", "Shoes"), p("b", "Accessories"), p("c", "Outerwear"), p("d", "Bottoms"), p("e", "Tops")]);
    expect(out.map((x) => x.category)).toEqual(["Outerwear", "Tops", "Bottoms", "Shoes", "Accessories"]);
  });

  it("breaks ties by id, so client and server number two accessories the same way", () => {
    const one = orderPieces([p("z-watch", "Accessories"), p("a-cuff", "Accessories")]).map((x) => x.id);
    const two = orderPieces([p("a-cuff", "Accessories"), p("z-watch", "Accessories")]).map((x) => x.id);
    expect(one).toEqual(["a-cuff", "z-watch"]);
    expect(two).toEqual(one);
  });
});

describe("snapshotPieces", () => {
  const pieces = [p("2", "Tops", "Cream knit", "Hartley"), p("1", "Outerwear", "Camel overcoat", "  "), p("3", "Fragrance", "Vetiver", "Maison")];
  it("numbers from 1 in reading order and hides brands by default", () => {
    expect(snapshotPieces(pieces, false)).toEqual([
      { n: 1, name: "Camel overcoat", category: "Outerwear", brand: null },
      { n: 2, name: "Cream knit", category: "Tops", brand: null },
      { n: 3, name: "Vetiver", category: "Fragrance", brand: null },
    ]);
  });
  it("shows trimmed brands only when asked; a blank brand stays null", () => {
    expect(snapshotPieces(pieces, true).map((x) => x.brand)).toEqual([null, "Hartley", "Maison"]);
  });
  it("keeps at most eight pieces", () => {
    expect(snapshotPieces(Array.from({ length: 11 }, (_, i) => p(String(i).padStart(2, "0"), "Accessories")), false)).toHaveLength(8);
  });
});

describe("labels, kicker, expiry, guards", () => {
  it("labels with a brand only when present", () => {
    expect(pieceLabel({ name: "Camel overcoat", brand: "Hartley" })).toBe("Camel overcoat — Hartley");
    expect(pieceLabel({ name: "Camel overcoat", brand: null })).toBe("Camel overcoat");
  });
  it("writes the kicker with a fixed month name", () => {
    expect(shareKicker("everyday", "2026-09-26")).toBe("Everyday · 26 Sep");
    expect(shareKicker("", "2026-01-03")).toBe("3 Jan");
    expect(shareKicker("work", null)).toBe("Work");
  });
  it("expires 30 days after publishing", () => {
    expect(shareExpiry("2026-09-26T10:00:00.000Z").toISOString()).toBe("2026-10-26T10:00:00.000Z");
  });
  it("accepts only 22-char base64url tokens and uuids", () => {
    expect(isShareToken("AAAAAAAAAAAAAAAAAAAAAA")).toBe(true);
    expect(isShareToken("AAAA/AAAAAAAAAAAAAAAAA")).toBe(false);
    expect(isUuid("77777777-7777-4777-8777-777777777777")).toBe(true);
    expect(isUuid("../x")).toBe(false);
  });
});
