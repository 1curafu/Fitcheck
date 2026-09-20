import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { DeleteAccountSheet } from "../delete-account-sheet";

const email = "mykhailo@example.com";

function setup(
  over: Partial<React.ComponentProps<typeof DeleteAccountSheet>> = {},
) {
  const onClose = vi.fn();
  const action = vi.fn().mockResolvedValue({ status: "idle" as const });
  render(
    <DeleteAccountSheet open email={email} action={action} onClose={onClose} {...over} />,
  );
  return { action, onClose };
}

function ControlledSheet({
  action = vi.fn().mockResolvedValue({ status: "idle" as const }),
}: {
  action?: React.ComponentProps<typeof DeleteAccountSheet>["action"];
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <DeleteAccountSheet open={open} email={email} action={action} onClose={() => setOpen(false)} />
    </>
  );
}

test("a closed deletion sheet is absent and an open one is a labelled dialog", () => {
  const { rerender } = render(
    <DeleteAccountSheet
      open={false}
      email={email}
      action={vi.fn().mockResolvedValue({ status: "idle" as const })}
      onClose={vi.fn()}
    />,
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  rerender(
    <DeleteAccountSheet
      open
      email={email}
      action={vi.fn().mockResolvedValue({ status: "idle" as const })}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByRole("dialog", { name: "Delete account" })).toHaveAttribute(
    "aria-modal",
    "true",
  );
});

test("the confirmation names every category of data and the backup ceiling", () => {
  setup();
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent(/account/i);
  expect(dialog).toHaveTextContent(/photos and clothes/i);
  expect(dialog).toHaveTextContent(/outfits/i);
  expect(dialog).toHaveTextContent(/wear history/i);
  expect(dialog).toHaveTextContent(/trips/i);
  expect(dialog).toHaveTextContent(/preferences/i);
  expect(dialog).toHaveTextContent(/immediate.*cannot be undone/i);
  expect(dialog).toHaveTextContent(/30 days/i);
});

test("deletion stays disabled until the displayed email is entered exactly", async () => {
  setup();
  const input = screen.getByLabelText(/type .*email/i);
  const submit = screen.getByRole("button", { name: /^delete account$/i });
  expect(submit).toBeDisabled();

  await userEvent.type(input, "mykhailo@example.co");
  expect(submit).toBeDisabled();
  await userEvent.type(input, "m");
  expect(submit).toBeEnabled();
});

test("backdrop and Cancel close, then reopening starts with an empty confirmation", async () => {
  render(<ControlledSheet />);
  const input = screen.getByLabelText(/type .*email/i);
  await userEvent.type(input, email);
  await userEvent.click(screen.getByRole("button", { name: /^close$/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Reopen" }));
  expect(screen.getByLabelText(/type .*email/i)).toHaveValue("");
  await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reopen" }));
  expect(screen.getByLabelText(/type .*email/i)).toHaveValue("");
});

test("a pending deletion is non-dismissible and locks every control", async () => {
  let resolveAction: ((state: { status: "idle" }) => void) | undefined;
  const action = vi.fn(
    () =>
      new Promise<{ status: "idle" }>((resolve) => {
        resolveAction = resolve;
      }),
  );
  setup({ action });
  await userEvent.type(screen.getByLabelText(/type .*email/i), email);
  await userEvent.click(screen.getByRole("button", { name: /^delete account$/i }));

  expect(screen.getByLabelText(/type .*email/i)).toBeDisabled();
  expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /^close$/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /deleting…/i })).toBeDisabled();

  await act(async () => resolveAction?.({ status: "idle" }));
});

test("a returned deletion error is announced without clearing the confirmation", async () => {
  setup({
    action: vi.fn().mockResolvedValue({
      status: "error" as const,
      message: "We couldn't delete your account. Please try again.",
    }),
  });
  const input = screen.getByLabelText(/type .*email/i);
  await userEvent.type(input, email);
  await userEvent.click(screen.getByRole("button", { name: /^delete account$/i }));

  expect(await screen.findByRole("status")).toHaveTextContent(/couldn't delete/i);
  expect(input).toHaveValue(email);
});
