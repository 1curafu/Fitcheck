import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StyleCta } from "../style-cta";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const styleWithItem = vi.fn();
vi.mock("@/app/closet/[itemId]/style-actions", () => ({
  styleWithItem: (...args: unknown[]) => styleWithItem(...args),
}));

beforeEach(() => {
  push.mockClear();
  styleWithItem.mockReset();
});

test("a successful styling opens the FIRST look of the set it produced", async () => {
  // A styling now returns two looks, not one — see STYLED_LOOKS.
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o9", "o10"] });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(push).toHaveBeenCalledWith("/outfits/o9");
});

test("the first tap is a cache-friendly read, never a regenerate", async () => {
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o9"] });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(styleWithItem).toHaveBeenCalledWith("i1", { regenerate: false });
});

test("'try another' is offered only AFTER a look exists", async () => {
  // Before there is anything to compare against, the control has no meaning.
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o9"] });
  render(<StyleCta itemId="i1" styledToday={false} />);
  expect(screen.queryByRole("button", { name: /try another/i })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(await screen.findByRole("button", { name: /try another/i })).toBeInTheDocument();
});

test("'try another' asks for a regenerate, which skips the cache", async () => {
  // The cache is correct but silent: tapping the primary again returned the
  // identical look with no explanation. This is the affordance that fixes it.
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o9"] });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  await userEvent.click(await screen.findByRole("button", { name: /try another/i }));
  expect(styleWithItem).toHaveBeenLastCalledWith("i1", { regenerate: true });
});

test("the control says what it does — an icon alone would not", async () => {
  // PR #20 tried an icon-only Regenerate on the stylist screen and rejected it:
  // nothing tells you a ⟳ means "spend an AI call".
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o9"] });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect((await screen.findByRole("button", { name: /try another/i })).textContent).toMatch(/try another look/i);
});

// The seam knows WHICH limit was hit. This copy previously said "that's today's
// stylings used — back tomorrow", written when styling was assumed to share the
// daily generation allowance. It is a Pro capability, so tomorrow gives a free
// user no more of them — the message told people to wait for something that
// would never arrive.
test("a limited result opens the upgrade sheet with the reason verbatim", async () => {
  styleWithItem.mockResolvedValue({
    status: "limited",
    message: "Building a look around a piece is a Pro feature.",
  });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  const sheet = await screen.findByRole("dialog");
  expect(sheet).toHaveTextContent(/pro feature/i);
  expect(screen.queryByText(/back tomorrow/i)).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

// A gate the user cannot dismiss is a trap. "Not now" must stay as reachable
// as the upgrade path.
test("the upgrade sheet can be dismissed", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  await screen.findByRole("dialog");
  await userEvent.click(screen.getByRole("button", { name: /not now/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

// A gate that ends in a shrug teaches nothing. The sheet carries the whole
// pitch itself — same list the profile card opens — so there is nowhere to
// navigate to and nothing to look up.
test("the gate's sheet makes the full case, not just the refusal", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  const sheet = await screen.findByRole("dialog");
  expect(sheet).toHaveTextContent(/gap analysis/i);
  expect(sheet).toHaveTextContent(/€5\/mo/);
});

// "Your closet is too thin for this yet" has nothing to sell — you add a piece.
// Surfacing it as an upgrade prompt would be selling against a non-problem.
test("a non-billing failure stays a quiet line, not an upgrade sheet", async () => {
  styleWithItem.mockResolvedValue({
    status: "empty",
    message: "Fragrance finishes a look rather than forming one.",
  });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(await screen.findByRole("status")).toHaveTextContent(/fragrance finishes/i);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

// Nobody buys a feature they have never seen, and this is the screen where the
// want is felt — so the gate explains itself rather than hiding the control.
test("the button stays available to a gated user", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<StyleCta itemId="i1" styledToday={false} />);
  const button = screen.getByRole("button", { name: /style an outfit/i });
  await userEvent.click(button);
  await screen.findByRole("dialog");
  expect(button).toBeEnabled();
});

test("an empty result explains itself too", async () => {
  styleWithItem.mockResolvedValue({
    status: "empty",
    message: "Fragrance finishes a look rather than forming one.",
  });
  render(<StyleCta itemId="i1" styledToday={false} />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(await screen.findByRole("status")).toHaveTextContent(/fragrance finishes/i);
});

test("'try another' shows on load when a set already exists from an earlier tap", async () => {
  // The bug this guards: tapping the primary navigates to the look, so a flag
  // set on that tap is gone when the user comes back and this remounts. Seeded
  // from the server, the control survives the round trip — without it, it could
  // never appear at all.
  render(<StyleCta itemId="i1" styledToday />);
  expect(screen.getByRole("button", { name: /try another/i })).toBeInTheDocument();
});
