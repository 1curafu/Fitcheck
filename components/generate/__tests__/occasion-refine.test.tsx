import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OccasionRow } from "../occasion-row";
import { RefineSheet } from "../refine-sheet";

test("occasion chips use the SELECT variant (rust-tint), not the filter/cream variant (D4)", () => {
  render(<OccasionRow occasion="everyday" onOccasion={() => {}} onRefine={() => {}} />);
  const active = screen.getByRole("button", { name: "Everyday" });
  expect(active).toHaveClass("bg-brand/15", "text-brand-high");
  expect(active).not.toHaveClass("bg-foreground", "text-canvas");
});

test("occasion is single-select and fires onOccasion", async () => {
  const onOccasion = vi.fn();
  const { rerender } = render(
    <OccasionRow occasion="work" onOccasion={onOccasion} onRefine={() => {}} />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Evening" }));
  expect(onOccasion).toHaveBeenCalledWith("evening");
  rerender(<OccasionRow occasion="evening" onOccasion={onOccasion} onRefine={() => {}} />);
  expect(screen.getByRole("button", { name: "Evening" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Work" })).toHaveAttribute("aria-pressed", "false");
});

test("Refine: formality single-select, palette multi-select, apply carries the intent", async () => {
  const onApply = vi.fn();
  render(<RefineSheet open occasionLabel="Everyday" onApply={onApply} onClose={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "3" }));
  await userEvent.click(screen.getByRole("button", { name: "4" }));
  expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "4" })).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: "camel" }));
  await userEvent.click(screen.getByRole("button", { name: "navy" }));
  await userEvent.click(screen.getByRole("button", { name: "Show 3 looks" }));
  expect(onApply).toHaveBeenCalledWith({ formality: 4, mustColors: ["camel", "navy"] });
});
