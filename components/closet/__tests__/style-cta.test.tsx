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

test("a successful styling opens the look it produced", async () => {
  styleWithItem.mockResolvedValue({ status: "ok", outfitId: "o9" });
  render(<StyleCta itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(push).toHaveBeenCalledWith("/outfits/o9");
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
  render(<StyleCta itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  const sheet = await screen.findByRole("dialog");
  expect(sheet).toHaveTextContent(/pro feature/i);
  expect(screen.queryByText(/back tomorrow/i)).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

// A gate the user cannot dismiss is a trap, and the sheet is an explanation
// rather than a checkout — there is nothing to complete.
test("the upgrade sheet can be dismissed", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<StyleCta itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  await screen.findByRole("dialog");
  await userEvent.click(screen.getByRole("button", { name: /got it/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

// "Your closet is too thin for this yet" has nothing to sell — you add a piece.
// Surfacing it as an upgrade prompt would be selling against a non-problem.
test("a non-billing failure stays a quiet line, not an upgrade sheet", async () => {
  styleWithItem.mockResolvedValue({
    status: "empty",
    message: "Fragrance finishes a look rather than forming one.",
  });
  render(<StyleCta itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(await screen.findByRole("status")).toHaveTextContent(/fragrance finishes/i);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

// Nobody buys a feature they have never seen, and this is the screen where the
// want is felt — so the gate explains itself rather than hiding the control.
test("the button stays available to a gated user", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<StyleCta itemId="i1" />);
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
  render(<StyleCta itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /style an outfit/i }));
  expect(await screen.findByRole("status")).toHaveTextContent(/fragrance finishes/i);
});
