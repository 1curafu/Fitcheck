import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutfitDetail } from "../outfit-detail";

const back = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));
// The Server Actions are the write path, exercised live rather than here — this
// keeps the component test about what the screen SAYS.
vi.mock("@/app/outfits/[id]/actions", () => ({
  toggleWear: vi.fn(),
  toggleFavorite: vi.fn(),
  // Fired on mount to stamp `viewed_at`, which is what the evening wear
  // confirmation asks about. Resolved, not undefined: the component calls
  // `.catch()` on it.
  noteOutfitViewed: vi.fn().mockResolvedValue(undefined),
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

// A piece the storage layer could not sign arrives as "" (the page maps a
// missing signed URL to the empty string). React reports `<img src="">` as an
// error, which the dev overlay throws up over an otherwise working screen —
// the flat-lay and the piece row must both go one image lighter instead.
test("a piece with no signed image renders no broken img in either place", () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container } = render(
    <OutfitDetail
      outfit={outfit}
      pieces={[{ ...pieces[0], imageUrl: "" }, pieces[1]]}
      worn={false}
      favorite={false}
    />,
  );
  expect(container.querySelector('img[src=""]')).toBeNull();
  expect(err).not.toHaveBeenCalled();
  err.mockRestore();
  // The piece itself is still part of the look — only its picture is missing.
  expect(screen.getByRole("link", { name: /brushed oxford/i })).toBeInTheDocument();
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

// This is the screen where the user is looking at the clothes, so it is where
// "what is that, exactly?" gets asked — each row opens that garment.
test("each piece row opens that item in the closet", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  expect(screen.getByRole("link", { name: /brushed oxford/i })).toHaveAttribute(
    "href",
    "/closet/i1",
  );
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

// Reached by a shared link, a refresh, or a PWA cold start, this screen is the
// FIRST history entry — `router.back()` alone is a dead control that silently
// does nothing.
test("back falls out to the stylist screen when there is no history to return to", async () => {
  back.mockClear();
  push.mockClear();
  const spy = vi.spyOn(window.history, "length", "get").mockReturnValue(1);
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  await userEvent.click(screen.getByRole("button", { name: /back/i }));
  expect(back).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/generate");
  spy.mockRestore();
});

test("back returns to where you came from when there is history", async () => {
  back.mockClear();
  push.mockClear();
  const spy = vi.spyOn(window.history, "length", "get").mockReturnValue(3);
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} favorite={false} />);
  await userEvent.click(screen.getByRole("button", { name: /back/i }));
  expect(back).toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  spy.mockRestore();
});
