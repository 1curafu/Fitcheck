import { render, screen } from "@testing-library/react";
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
  expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  expect(save()).toBeDisabled(); // the saved state is the new baseline
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
  expect(await screen.findByRole("status")).toHaveTextContent(/couldn.t save/i);
  expect(screen.getByRole("button", { name: "Shorts" })).toHaveAttribute("aria-pressed", "true");
  expect(save()).toBeEnabled();
});
