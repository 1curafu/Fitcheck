import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OccasionRow } from "../occasion-row";
import { RefineSheet } from "../refine-sheet";

test("occasion chips use the SELECT variant (rust-tint), not the filter/cream variant (D4)", () => {
  render(<OccasionRow occasion="everyday" onOccasion={() => {}} />);
  const active = screen.getByRole("button", { name: "Everyday" });
  expect(active).toHaveClass("bg-brand/15", "text-brand-high");
  expect(active).not.toHaveClass("bg-foreground", "text-canvas");
});

test("occasion is single-select and fires onOccasion", async () => {
  const onOccasion = vi.fn();
  const { rerender } = render(
    <OccasionRow occasion="work" onOccasion={onOccasion} />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Evening" }));
  expect(onOccasion).toHaveBeenCalledWith("evening");
  rerender(<OccasionRow occasion="evening" onOccasion={onOccasion} />);
  expect(screen.getByRole("button", { name: "Evening" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Work" })).toHaveAttribute("aria-pressed", "false");
});

test("all four occasions are present and the row does NOT scroll", () => {
  // Measured on a 390px iPhone, the old scrolling row put "Evening" 100%
  // off-screen — a quarter of the feature was undiscoverable. jsdom can't
  // measure layout, so guard the structure: no horizontal-scroll container,
  // and every chip flexes to share the width.
  const { container } = render(<OccasionRow occasion="everyday" onOccasion={() => {}} />);
  for (const label of ["Everyday", "Work", "Weekend", "Evening"]) {
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  }
  const row = container.firstElementChild as HTMLElement;
  expect(row.className).not.toMatch(/overflow-x-auto/);
  expect(row.className).not.toMatch(/mask-image/);
  expect(screen.getByRole("button", { name: "Evening" }).className).toMatch(/flex-1/);
});

test("Refine is no longer inside the occasion row (it's a header action, not a 5th occasion)", () => {
  render(<OccasionRow occasion="everyday" onOccasion={() => {}} />);
  expect(screen.queryByRole("button", { name: /refine/i })).toBeNull();
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
  expect(onApply).toHaveBeenCalledWith({ formality: 4, lean: ["camel", "navy"] });
});
