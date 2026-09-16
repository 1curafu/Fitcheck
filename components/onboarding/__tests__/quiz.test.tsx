import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Quiz } from "../quiz";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/app/onboarding/actions", () => ({ saveStyleProfile: vi.fn() }));

test("the first step carries the agreement, where the account becomes real", () => {
  render(<Quiz />);
  expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute("href", "/terms");
  expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
  // The policy says 16+, and the legal review rated self-declaration as enough —
  // but only if the app actually asks. This is where it asks.
  expect(screen.getByText(/16 or older/)).toBeInTheDocument();
});

test("later steps do not repeat it — once, at the point of agreement", async () => {
  render(<Quiz />);
  // Pick the first option of question one, then Continue.
  const back = screen.getByRole("button", { name: /back/i });
  const cont = screen.getByRole("button", { name: /^continue$/i });
  const option = screen.getAllByRole("button").find((b) => b !== back && b !== cont)!;
  await userEvent.click(option);
  await userEvent.click(cont);
  expect(screen.queryByRole("link", { name: /privacy policy/i })).toBeNull();
});
