import { render, screen, fireEvent } from "@testing-library/react";
import { ColorPicker } from "../color-picker";

/**
 * The palette is collapsed once something is selected — 21 swatches flat ran to
 * three rows and pushed the rest of the form off screen. These helpers open it
 * first so each test exercises the palette itself.
 */
function open() {
  fireEvent.click(screen.getByRole("button", { name: /choose colours|hide colour palette/i }));
}

test("renders a swatch per palette colour with an accessible name", () => {
  render(<ColorPicker value={[]} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: /navy/i })).toBeInTheDocument();
});

test("selecting a colour adds it; selecting again removes it", () => {
  const onChange = vi.fn();
  const { rerender } = render(<ColorPicker value={[]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "navy" }));
  expect(onChange).toHaveBeenCalledWith(["navy"]);

  // No open() here: `open` is useState-initialised at mount (value was empty),
  // and a rerender does not reset it — the palette is still showing.
  rerender(<ColorPicker value={["navy"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "navy" }));
  expect(onChange).toHaveBeenCalledWith([]);
});

test("selection is capped so the tag schema's max of 3 can never be violated", () => {
  const onChange = vi.fn();
  render(<ColorPicker value={["navy", "cream", "brown"]} onChange={onChange} />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "olive" }));
  expect(onChange).not.toHaveBeenCalled();
});

test("an already-selected colour can still be deselected at the cap", () => {
  const onChange = vi.fn();
  render(<ColorPicker value={["navy", "cream", "brown"]} onChange={onChange} />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "navy" }));
  expect(onChange).toHaveBeenCalledWith(["cream", "brown"]);
});

test("selected swatches are marked pressed for screen readers", () => {
  render(<ColorPicker value={["navy"]} onChange={() => {}} />);
  open();
  expect(screen.getByRole("button", { name: "navy" })).toHaveAttribute("aria-pressed", "true");
});

test("the selected ring uses a real theme token", () => {
  // Tailwind v4 `@theme` exposes the rust as `--color-brand`; there is no
  // `--brand`, and an undefined var renders no ring at all — the selected
  // state would be invisible.
  const { container } = render(<ColorPicker value={["navy"]} onChange={() => {}} />);
  open();
  const selected = screen.getByRole("button", { name: "navy" });
  expect(selected.className).toContain("var(--color-brand)");
  expect(container.innerHTML).not.toContain("var(--brand)");
});

test("the palette is collapsed once a colour is chosen, and summarised in one row", () => {
  render(<ColorPicker value={["navy", "cream"]} onChange={() => {}} />);
  // The swatch grid is hidden...
  expect(screen.queryByRole("button", { name: "olive" })).not.toBeInTheDocument();
  // ...but the answer is still readable without opening anything.
  expect(screen.getByText("navy · cream")).toBeInTheDocument();
});

test("it opens by default when nothing is selected, so the control never looks empty", () => {
  render(<ColorPicker value={[]} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: "olive" })).toBeInTheDocument();
});
