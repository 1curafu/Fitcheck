import uk from "@/messages/uk.json";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutfitDetail } from "../outfit-detail";
// The upgrade sheet imports the billing Server Actions (server-only); a rendering test never calls Stripe.
vi.mock("@/app/billing/actions", () => ({ startCheckout: vi.fn(), openBillingPortal: vi.fn() }));
vi.mock("@/app/[locale]/outfits/[id]/share-actions", () => ({ getShareState: vi.fn().mockResolvedValue(null), prepareShare: vi.fn(), publishShare: vi.fn(), stopSharing: vi.fn() }));

const back = vi.fn();
const push = vi.fn();
let pathname = "/outfits/o1";
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }), usePathname: () => pathname }));
// The Server Actions are the write path, exercised live rather than here — this
// keeps the component test about what the screen SAYS.
vi.mock("@/app/[locale]/outfits/[id]/actions", () => ({
  toggleWear: vi.fn(),
  setSaved: vi.fn().mockResolvedValue({ status: "saved" }),
  // Fired on mount to stamp `viewed_at`, which is what the evening wear
  // confirmation asks about. Resolved, not undefined: the component calls
  // `.catch()` on it.
  noteOutfitViewed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/[locale]/outfits/text-actions", () => ({
  requestOutfitTexts: vi.fn().mockResolvedValue({locale: "uk", texts: [], busyIds: []}),
  refreshOutfitTexts: vi.fn().mockResolvedValue({locale: "uk", texts: [], busyIds: []}),
}));

const slot = { xPct: 10, yPct: 20, wPct: 30, hPct: 40, rotationDeg: -3, z: 2 };

const outfit = {
  textSource: { id: "o1", sourceLocale: "en-US" as const, name: "The Quiet Standard", why: "Camel over grey keeps the contrast soft enough for a long day." },
  textLocale: "en-US" as const, textTranslated: false,
  id: "o1",
  lookName: "The Quiet Standard",
  occasion: "work",
  weatherLabel: "18° Cloudy",
  reasoning: "Camel over grey keeps the contrast soft enough for a long day.",
  lookDate: "2026-09-26",
};
const pieces = [
  { id: "i1", name: "Brushed Oxford", brand: "Hartley", category: "Tops", imageUrl: "u1", slot },
  { id: "i2", name: "Pleated Chino", brand: "Ost", category: "Bottoms", imageUrl: "u2", slot },
];

test("the look name is the headline and the occasion + weather is the kicker", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
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
      saved={false}
    />,
  );
  expect(container.querySelector('img[src=""]')).toBeNull();
  expect(err).not.toHaveBeenCalled();
  err.mockRestore();
  // The piece itself is still part of the look — only its picture is missing.
  expect(screen.getByRole("link", { name: /brushed oxford/i })).toBeInTheDocument();
});

test("the stylist note is rendered as the italic why — the product's differentiator", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.getByText(/camel over grey/i)).toBeInTheDocument();
});

test("every piece is listed with its brand and category", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.getByText("Brushed Oxford")).toBeInTheDocument();
  expect(screen.getByText("Hartley")).toBeInTheDocument();
  expect(screen.getByText("Tops")).toBeInTheDocument();
});

// This is the screen where the user is looking at the clothes, so it is where
// "what is that, exactly?" gets asked — each row opens that garment.
test("each piece row opens that item in the closet", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.getByRole("link", { name: /brushed oxford/i })).toHaveAttribute(
    "href",
    "/closet/i1",
  );
});

test("the wear button states what it will do, and what it did", () => {
  const { rerender } = render(
    <OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />,
  );
  expect(screen.getByRole("button", { name: /wear this today/i })).toBeInTheDocument();
  rerender(<OutfitDetail outfit={outfit} pieces={pieces} worn={true} saved={false} />);
  expect(screen.getByRole("button", { name: /worn today/i })).toBeInTheDocument();
});

test("the favourite control exposes its state to screen readers", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={true} />);
  expect(screen.getByRole("button", { name: /saved/i })).toHaveAttribute(
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
      saved={false}
    />,
  );
  expect(screen.getByRole("heading", { name: /the quiet standard/i })).toBeInTheDocument();
});

// The stage re-renders the stored geometry, so the look the user tapped on the
// stylist screen is the same arrangement they see here — that is the whole
// reason outfits.layout is persisted.
test("the flat-lay places each piece at its stored position", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
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
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  await userEvent.click(screen.getByRole("button", { name: /back/i }));
  expect(back).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith("/generate");
  spy.mockRestore();
});

test("back returns to where you came from when there is history", async () => {
  back.mockClear();
  push.mockClear();
  const spy = vi.spyOn(window.history, "length", "get").mockReturnValue(3);
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  await userEvent.click(screen.getByRole("button", { name: /back/i }));
  expect(back).toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  spy.mockRestore();
});

// "Try another look" belongs to the look that has a piece to keep.
vi.mock("@/app/[locale]/closet/[itemId]/style-actions", () => ({ styleWithItem: vi.fn() }));

test("a look styled around a piece offers to try another", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} styledItemId="i1" />);
  expect(screen.getByRole("button", { name: /try another look/i })).toBeInTheDocument();
});

test("a daily-drop look does not — it regenerates as a set, from the stylist", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.queryByRole("button", { name: /try another look/i })).not.toBeInTheDocument();
});

test("wear and favourite are still there beside it", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} styledItemId="i1" />);
  expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /wear/i })).toBeInTheDocument();
});

test("cached translated prose renders without altering garment names or wear state", () => {
 (globalThis as {__intl?: {locale: string; messages: object}}).__intl = {locale: "uk", messages: uk};
 render(<OutfitDetail outfit={{...outfit, lookName: "Тихий стандарт", reasoning: "Спокійний контраст.", textLocale: "uk", textTranslated: true}} pieces={pieces} worn={true} saved={true} />);
 expect(screen.getByRole("heading", {name: "Тихий стандарт"})).toBeInTheDocument();
 expect(screen.getByText(/Спокійний контраст/)).toBeInTheDocument();
 expect(screen.getByText("Brushed Oxford")).toBeInTheDocument();
});


import { setSaved } from "@/app/[locale]/outfits/[id]/actions";

test("save and saved labels expose the bookmark state", () => {
  const { rerender } = render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
  rerender(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={true} />);
  expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
});

test("a limit opens the upgrade sheet and leaves the look unsaved", async () => {
  vi.mocked(setSaved).mockResolvedValueOnce({ status: "limit" });
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("dialog", { name: "Save this look" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
});

test("a missing look rolls back and explains the failed save", async () => {
  vi.mocked(setSaved).mockResolvedValueOnce({ status: "missing" });
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Couldn't save this look. Try again.");
  expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
});

test("historical saved looks show their date", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={true} savedOn="26 Sep" />);
  expect(screen.getByText("Saved look · 26 Sep")).toBeInTheDocument();
});

test("the save upgrade sheet closes on navigation", async () => {
  vi.mocked(setSaved).mockResolvedValueOnce({ status: "limit" });
  const { rerender } = render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await screen.findByRole("dialog", { name: "Save this look" });
  pathname = "/profile";
  rerender(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  pathname = "/outfits/o1";
});

test("the OpenWeather credit closes the page, after the pieces — not between the kicker and the title", () => {
  render(<OutfitDetail outfit={outfit} pieces={pieces} worn={false} saved={false} />);
  const credit = screen.getByText("Weather data © OpenWeather");
  const title = screen.getByRole("heading", { level: 1 });
  const lastPiece = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/closet/")).at(-1)!;
  expect(title.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(lastPiece.compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("no temperature on screen, no credit", () => {
  render(<OutfitDetail outfit={{ ...outfit, weatherLabel: "" }} pieces={pieces} worn={false} saved={false} />);
  expect(screen.queryByText(/openweather/i)).not.toBeInTheDocument();
});
