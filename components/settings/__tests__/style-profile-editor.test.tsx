import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StyleProfileEditor } from "../style-profile-editor";
import type { StyleProfileDraft } from "@/lib/onboarding/style-profile";

const complete: StyleProfileDraft = {
  archetype: "Old Money", palette: "Neutrals", fit: "Tailored",
  dress_codes: ["Smart casual"], occasions: ["Work"], nogos: [],
};
const save = () => screen.getByRole("button", { name: /save changes/i });

test("shows every question with the saved answers selected", () => {
  render(<StyleProfileEditor profile={{ ...complete, nogos: ["ripped"] }} onSaveAction={vi.fn()} />);
  for (const title of [/which closet/i, /colour instinct/i, /how should it sit/i, /the scale/i, /dress for/i, /off the table/i]) {
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  }
  expect(screen.getByRole("button", { name: "Ripped denim" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Shorts" })).toHaveAttribute("aria-pressed", "false");
});

test("Save waits for a change, then sends the full answer set", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<StyleProfileEditor profile={complete} onSaveAction={onSave} />);
  expect(save()).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  expect(save()).toBeEnabled();
  await userEvent.click(save());
  expect(onSave).toHaveBeenCalledWith({ ...complete, archetype: "Old Money", nogos: ["shorts"] });
  // The status region is always present, so wait for its TEXT; and the button reads "Saving…" until the save settles.
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/saved/i));
  await waitFor(() => expect(save()).toBeDisabled()); // the saved state is the new baseline
});

test("undoing a change disables Save again", async () => {
  render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  expect(save()).toBeDisabled();
});

test("a half-answered profile renders, and Save stays off until every required answer exists", async () => {
  render(<StyleProfileEditor profile={{ ...complete, palette: null, fit: null, dress_codes: [] }} onSaveAction={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  expect(save()).toBeDisabled();
});

test("a failed save says so and keeps the edit", async () => {
  render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn().mockRejectedValue(new Error("x"))} />);
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  await userEvent.click(save());
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/couldn.t save/i));
  expect(screen.getByRole("button", { name: "Shorts" })).toHaveAttribute("aria-pressed", "true");
  await waitFor(() => expect(save()).toBeEnabled());
});

test("the status region exists before anything is saved, so the first result is announced", () => {
  render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});

test("a half-answered profile says why Save is off, and the button points at the reason", async () => {
  render(<StyleProfileEditor profile={{ ...complete, palette: null }} onSaveAction={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  expect(screen.getByText(/at least one answer for each question/i)).toBeInTheDocument();
  expect(save()).toHaveAccessibleDescription(/at least one answer for each question/i);
});

test("a complete profile shows no reason line", () => {
  render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
  expect(screen.queryByText(/at least one answer for each question/i)).toBeNull();
});

test("editing while a save is in flight does not leave 'Saved' beside different answers", async () => {
  let finish: () => void = () => {};
  const onSave = vi.fn(() => new Promise<void>((r) => { finish = r; }));
  render(<StyleProfileEditor profile={complete} onSaveAction={onSave} />);
  await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
  await userEvent.click(save());
  await userEvent.click(screen.getByRole("button", { name: "Graphic tees" })); // changed AFTER the save started
  finish();
  await waitFor(() => expect(save()).toBeEnabled()); // the newer edit is unsaved, so Save is live again
  expect(screen.getByRole("status")).not.toHaveTextContent(/saved/i);
});

describe("the route stays mounted (React Activity), so the editor follows fresh server data", () => {
  test("a profile changed elsewhere replaces the answers when the user has no unsaved edits", () => {
    const { rerender } = render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
    rerender(<StyleProfileEditor profile={{ ...complete, nogos: ["ripped"] }} onSaveAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Ripped denim" })).toHaveAttribute("aria-pressed", "true");
    expect(save()).toBeDisabled(); // what is shown IS what is saved
  });

  test("unsaved edits survive a refresh, and Save is judged against the NEW saved answers", async () => {
    const { rerender } = render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
    rerender(<StyleProfileEditor profile={{ ...complete, nogos: ["ripped"] }} onSaveAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Shorts" })).toHaveAttribute("aria-pressed", "true"); // my edit stays
    expect(save()).toBeEnabled(); // and it still differs from what is saved
  });

  test("the profile prop coming back equal to what was just saved keeps the 'Saved' note", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<StyleProfileEditor profile={complete} onSaveAction={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
    await userEvent.click(save());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/saved/i));
    rerender(<StyleProfileEditor profile={{ ...complete, nogos: ["shorts"] }} onSaveAction={onSave} />);
    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });
});

test("the intro says every answer shapes today's looks", () => {
  render(<StyleProfileEditor profile={complete} onSaveAction={vi.fn()} />);
  expect(screen.getByText(/looks follow every answer/i)).toBeInTheDocument();
});

describe("a save that takes time (a slow network, a slow CI runner)", () => {
  // ⚠️ These pin the race that failed the post-merge run on `develop`: the save result lands AFTER the click resolves,
  // the status region is always in the DOM (so `findByRole("status")` returns at once, before any text), and the button
  // reads "Saving…" — not "Save changes" — until the pending state clears. Assertions must wait for the settled state.
  const later = <T,>(ms: number, run: () => T) => new Promise<T>((resolve, reject) => setTimeout(() => { try { resolve(run()); } catch (e) { reject(e); } }, ms));

  test("success: waits for 'Saved', then Save is off (the saved answers are the new baseline)", async () => {
    render(<StyleProfileEditor profile={complete} onSaveAction={() => later(60, () => undefined)} />);
    await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
    await userEvent.click(save());
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/saved/i));
    await waitFor(() => expect(save()).toBeDisabled());
  });

  test("failure: waits for the message, keeps the edit, and Save comes back", async () => {
    render(<StyleProfileEditor profile={complete} onSaveAction={() => later(60, () => { throw new Error("x"); })} />);
    await userEvent.click(screen.getByRole("button", { name: "Shorts" }));
    await userEvent.click(save());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/couldn.t save/i));
    await waitFor(() => expect(save()).toBeEnabled());
    expect(screen.getByRole("button", { name: "Shorts" })).toHaveAttribute("aria-pressed", "true");
  });
});
