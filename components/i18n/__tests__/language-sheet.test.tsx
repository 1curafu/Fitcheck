import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const mock = vi.hoisted(() => ({ replace: vi.fn(), setLocale: vi.fn(), close: vi.fn() }));
vi.mock("@/lib/i18n/navigation", () => ({ useRouter: () => ({ replace: mock.replace }), usePathname: () => "/generate" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("occasion=work&look=2") }));
vi.mock("@/lib/i18n/actions", () => ({ setLocale: mock.setLocale }));
import { LanguageSheet } from "../language-sheet";

beforeEach(() => { vi.clearAllMocks(); mock.setLocale.mockResolvedValue({ status: "ok" }); });

test("lists shipped languages in their own names and marks the current choice", () => {
  render(<LanguageSheet open current="en-US" onClose={mock.close} />);
  expect(screen.getByRole("button", { name: "English (US)" })).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: "Українська" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Deutsch" })).not.toBeInTheDocument();
});

test("saves the choice and preserves the page and query", async () => {
  render(<LanguageSheet open current="en-US" onClose={mock.close} />);
  await userEvent.click(screen.getByRole("button", { name: "Українська" }));
  expect(mock.setLocale).toHaveBeenCalledWith("uk");
  expect(mock.replace).toHaveBeenCalledWith({ pathname: "/generate", query: { occasion: "work", look: "2" } }, { locale: "uk" });
  expect(mock.close).toHaveBeenCalled();
});

test("Escape closes the sheet", async () => {
  render(<LanguageSheet open current="en-US" onClose={mock.close} />);
  await userEvent.keyboard("{Escape}");
  expect(mock.close).toHaveBeenCalled();
});

test("a failed action keeps the sheet open with translated feedback", async () => {
  mock.setLocale.mockRejectedValue(new Error("provider details"));
  render(<LanguageSheet open current="en-US" onClose={mock.close} />);
  await userEvent.click(screen.getByRole("button", { name: "Українська" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t change the language. Try again.");
  expect(mock.replace).not.toHaveBeenCalled();
  expect(mock.close).not.toHaveBeenCalled();
});
