import { render, screen } from "@testing-library/react";
import { OutfitDetail } from "../outfit-detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }) }));
// The Server Actions are the write path, exercised live rather than here — this
// keeps the component test about what the screen SAYS.
vi.mock("@/app/outfits/[id]/actions", () => ({
  toggleWear: vi.fn(),
  toggleFavorite: vi.fn(),
}));

const slot = { xPct: 10, yPct: 20, wPct: 30, hPct: 40, rotationDeg: -3, z: 2 };

const outfit = {
  id: "o1",
  lookName: "The Quiet Standard",
  occasion: "work",
  weatherLabel: "18° Cloudy",
  reasoning: "Camel over grey keeps the contrast soft enough for a long day.",
};
const pieces = [
  { id: "i1", name: "Brushed Oxford", brand: "Hartley", category: "Tops", imageUrl: "u1", slot },
  { id: "i2", name: "Pleated Chino", brand: "Ost", category: "Bottoms", imageUrl: "u2", slot },
];

test("the look name is the headline and the occasion + weather is the kicker", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  expect(screen.getByRole("heading", { name: /the quiet standard/i })).toBeInTheDocument();
  expect(screen.getByText(/work · 18° cloudy/i)).toBeInTheDocument();
});

test("the stylist note is rendered as the italic why — the product's differentiator", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  expect(screen.getByText(/camel over grey/i)).toBeInTheDocument();
});

test("every piece is listed with its brand and category", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  expect(screen.getByText("Brushed Oxford")).toBeInTheDocument();
  expect(screen.getByText("Hartley")).toBeInTheDocument();
  expect(screen.getByText("Tops")).toBeInTheDocument();
});

test("the wear button states what it will do, and what it did", () => {
  const { rerender } = render(
    <OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />,
  );
  expect(screen.getByRole("button", { name: /wear this today/i })).toBeInTheDocument();
  rerender(<OutfitDetail outfit={outfit} pieces={pieces} worn={true} favorite={false} />);
  expect(screen.getByRole("button", { name: /worn today/i })).toBeInTheDocument();
});

test("the favourite control exposes its state to screen readers", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={true} />);
  expect(screen.getByRole("button", { name: /favourite/i })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("an outfit with no stylist note still renders the rest", () => {
  render(
    <OutfitDetail
      outfit={{ ...outfit, reasoning: null }}
      pieces={pieces}
      worn={false}
      favorite={false}
    />,
  );
  expect(screen.getByRole("heading", { name: /the quiet standard/i })).toBeInTheDocument();
});

// The stage re-renders the stored geometry, so the look the user tapped on the
// stylist screen is the same arrangement they see here — that is the whole
// reason outfits.layout is persisted.
test("the flat-lay places each piece at its stored position", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  const stage = screen.getByTestId("detail-stage");
  const img = stage.querySelector("img");
  expect(img).toHaveStyle({ left: "10%", top: "20%", width: "30%", height: "40%" });
});
