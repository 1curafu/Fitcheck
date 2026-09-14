import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TryAnotherLook } from "../try-another-look";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const styleWithItem = vi.fn();
vi.mock("@/app/closet/[itemId]/style-actions", () => ({
  styleWithItem: (...args: unknown[]) => styleWithItem(...args),
}));
beforeEach(() => { push.mockClear(); styleWithItem.mockReset(); });

test("it asks for a regenerate, which skips the cache", async () => {
  // The cache is correct but silent: the item's primary returns the identical
  // look with no explanation. This is the affordance that fixes it.
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o10"] });
  render(<TryAnotherLook itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /try another look/i }));
  expect(styleWithItem).toHaveBeenCalledWith("i1", { regenerate: true });
});

test("it opens the FIRST look of the new set", async () => {
  styleWithItem.mockResolvedValue({ status: "ok", outfitIds: ["o10", "o11"] });
  render(<TryAnotherLook itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /try another look/i }));
  expect(push).toHaveBeenCalledWith("/outfits/o10");
});

test("the control says what it does — an icon alone would not", () => {
  // PR #20 tried an icon-only ⟳ and rejected it: nothing says it spends an AI call.
  render(<TryAnotherLook itemId="i1" />);
  expect(screen.getByRole("button").textContent).toMatch(/try another look/i);
});

test("a limited result opens the upgrade sheet, verbatim", async () => {
  styleWithItem.mockResolvedValue({ status: "limited", message: "Pro feature." });
  render(<TryAnotherLook itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /try another look/i }));
  expect(await screen.findByRole("dialog")).toHaveTextContent(/pro feature/i);
});

test("a thin closet is a quiet line, not a sheet", async () => {
  styleWithItem.mockResolvedValue({ status: "empty", message: "Not enough other pieces." });
  render(<TryAnotherLook itemId="i1" />);
  await userEvent.click(screen.getByRole("button", { name: /try another look/i }));
  expect(await screen.findByRole("status")).toHaveTextContent(/not enough/i);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
