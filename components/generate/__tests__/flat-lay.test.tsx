import { render, screen } from "@testing-library/react";
import { FlatLay } from "../flat-lay";
import type { Look, LookPiece } from "@/lib/generator/types";

const piece = (over: Partial<LookPiece>): LookPiece => ({
  itemId: "x",
  category: "Tops",
  subcategory: null,
  brand: null,
  name: null,
  colors: [],
  cutoutUrl: "/x.png",
  slot: { xPct: 0, yPct: 0, wPct: 10, hPct: 10, rotationDeg: 0, z: 1 },
  ...over,
});

const look: Look = {
  name: "The Camel",
  why: "why",
  anchorIndex: 3,
  pieces: [
    piece({ itemId: "a", cutoutUrl: "/a.png", slot: { xPct: 56, yPct: 10, wPct: 36, hPct: 34, rotationDeg: 4, z: 2 } }),
    piece({ itemId: "b", cutoutUrl: "/b.png", slot: { xPct: 58, yPct: 46, wPct: 34, hPct: 44, rotationDeg: -3, z: 2 } }),
    piece({ itemId: "c", cutoutUrl: "/c.png", slot: { xPct: 18, yPct: 74, wPct: 40, hPct: 20, rotationDeg: 6, z: 2 } }),
    piece({ itemId: "d", cutoutUrl: "/d.png", category: "Outerwear", slot: { xPct: 6, yPct: 8, wPct: 46, hPct: 64, rotationDeg: -5, z: 3 } }),
  ],
};

const reduceMatchMedia = () =>
  vi.fn().mockReturnValue({
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

test("renders one img per piece with its cutout src", () => {
  render(<FlatLay look={look} />);
  const imgs = screen.getAllByRole("img");
  expect(imgs).toHaveLength(4);
  expect(imgs[3].getAttribute("src")).toBe("/d.png");
});

test("each piece is positioned by its slot (inline left/top/width/height/z)", () => {
  render(<FlatLay look={look} />);
  const outer = screen.getAllByRole("img")[3];
  expect(outer.style.left).toBe("6%");
  expect(outer.style.top).toBe("8%");
  expect(outer.style.width).toBe("46%");
  expect(outer.style.zIndex).toBe("3");
});

test("each img is object-contain (no clip)", () => {
  render(<FlatLay look={look} />);
  for (const img of screen.getAllByRole("img")) expect(img).toHaveClass("object-contain");
});

test("🔴 reduced-motion: every piece img is VISIBLE (opacity 1), never gated on animation (D1)", () => {
  window.matchMedia = reduceMatchMedia() as never;
  render(<FlatLay look={look} />);
  const imgs = screen.getAllByRole("img");
  expect(imgs).toHaveLength(4);
  for (const img of imgs) {
    expect(img.style.opacity).toBe("1");
    expect(img.style.transform).toContain("rotate");
  }
});
