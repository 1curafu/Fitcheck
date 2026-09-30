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
  for (const name of ["Русский", "Deutsch", "Français", "Italiano", "Português", "Español", "Nederlands"]) {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  }
});

test.each([["Українська", "uk"], ["English (UK)", "en-GB"], ["Deutsch", "de"], ["Português", "pt"]])("saves %s and preserves the page and query", async (name, locale) => {
  render(<LanguageSheet open current="en-US" onClose={mock.close} />);
  await userEvent.click(screen.getByRole("button", { name }));
  expect(mock.setLocale).toHaveBeenCalledWith(locale);
  expect(mock.replace).toHaveBeenCalledWith({ pathname: "/generate", query: { occasion: "work", look: "2" } }, { locale });
  expect(mock.close).toHaveBeenCalled();
});

test("an end-aligned menu opens from the button's right edge, so a top-right button stays on screen", () => {
  render(<LanguageSheet open current="en-US" align="end" onClose={mock.close} />);
  expect(screen.getByRole("dialog")).toHaveClass("right-0");
  expect(screen.getByRole("dialog")).not.toHaveClass("left-0");
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
