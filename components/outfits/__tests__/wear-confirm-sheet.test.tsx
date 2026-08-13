import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { WearConfirmSheet } from "../wear-confirm-sheet";

function setup(over: Partial<React.ComponentProps<typeof WearConfirmSheet>> = {}) {
  const onYes = vi.fn();
  const onNo = vi.fn();
  const onDismiss = vi.fn();
  render(
    <WearConfirmSheet
      open
      lookName="Navy & Black"
      onYes={onYes}
      onNo={onNo}
      onDismiss={onDismiss}
      {...over}
    />,
  );
  return { onYes, onNo, onDismiss };
}

test("Yes and No carry EXACTLY equal weight", () => {
  // The whole design. A lone Yes with a dismiss ✕ gets tapped to clear the
  // sheet and the data inflates anyway — the exact failure that got the
  // auto-log toggle rejected twice.
  setup();
  const yes = screen.getByRole("button", { name: /^yes$/i });
  const no = screen.getByRole("button", { name: /^no$/i });
  expect(yes.className).toBe(no.className);
});

test("there is no third way out that looks like an answer", () => {
  // "Not now" / "Skip" / "Close" is the lone-Yes problem wearing a different
  // hat: the easiest escape becomes the default, and here the default would be
  // a lie about what the user wore.
  setup();
  expect(
    screen.queryByRole("button", { name: /not now|skip|later|close|maybe/i }),
  ).not.toBeInTheDocument();
});

test("the backdrop dismisses WITHOUT answering", () => {
  // It exists so the sheet is not a trap, and it records nothing — a mis-tap
  // must not silently consume the day's question.
  const { onDismiss, onYes, onNo } = setup();
  const backdrop = screen.getByRole("button", { name: /dismiss/i });
  backdrop.click();
  expect(onDismiss).toHaveBeenCalled();
  expect(onYes).not.toHaveBeenCalled();
  expect(onNo).not.toHaveBeenCalled();
});

test("it names the look, so the user knows what they are answering about", () => {
  setup();
  expect(screen.getByRole("heading")).toHaveTextContent(/navy & black/i);
});

test("it says outright that we never log a wear for them", () => {
  // The promise the rejected toggle would have broken. Stating it is what makes
  // an honest "No" feel safe to give.
  setup();
  expect(screen.getByText(/never log a wear for you/i)).toBeInTheDocument();
});

test("Yes and No each call their own handler", async () => {
  const { onYes, onNo } = setup();
  await userEvent.click(screen.getByRole("button", { name: /^yes$/i }));
  expect(onYes).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: /^no$/i }));
  expect(onNo).toHaveBeenCalledTimes(1);
});

test("both answers are disabled while a write is in flight", async () => {
  // A double-tapped Yes is harmless against the unique index, but a double
  // tapped No followed by a Yes is not — freeze both until it lands.
  setup({ pending: true });
  expect(screen.getByRole("button", { name: /^yes$/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /^no$/i })).toBeDisabled();
});

test("it sits above the bottom nav, fixed rather than absolute", () => {
  // MobileNav is z-50 and renders after the page content. RefineSheet shipped
  // both of these wrong and its controls were unreachable.
  setup();
  const dialog = screen.getByRole("dialog");
  expect(dialog.className).toMatch(/\bfixed\b/);
  expect(dialog.className).toMatch(/z-\[70\]/);
  expect(dialog.className).not.toMatch(/\babsolute\b/);
});

test("a closed sheet renders nothing at all", () => {
  setup({ open: false });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^yes$/i })).not.toBeInTheDocument();
});
