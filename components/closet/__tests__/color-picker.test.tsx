import { render, screen, fireEvent } from "@testing-library/react";
import { ColorPicker } from "../color-picker";

test("renders a swatch per palette colour with an accessible name", () => {
  render(<ColorPicker value={[]} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: /navy/i })).toBeInTheDocument();
});

test("selecting a colour adds it; selecting again removes it", () => {
  const onChange = vi.fn();
  const { rerender } = render(<ColorPicker value={[]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /navy/i }));
  expect(onChange).toHaveBeenCalledWith(["navy"]);

  rerender(<ColorPicker value={["navy"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /navy/i }));
  expect(onChange).toHaveBeenCalledWith([]);
});

test("selection is capped so the tag schema's max of 3 can never be violated", () => {
  const onChange = vi.fn();
  render(<ColorPicker value={["navy", "cream", "brown"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /olive/i }));
  expect(onChange).not.toHaveBeenCalled();
});

test("an already-selected colour can still be deselected at the cap", () => {
  const onChange = vi.fn();
  render(<ColorPicker value={["navy", "cream", "brown"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /navy/i }));
  expect(onChange).toHaveBeenCalledWith(["cream", "brown"]);
});

test("selected swatches are marked pressed for screen readers", () => {
  render(<ColorPicker value={["navy"]} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: /navy/i })).toHaveAttribute("aria-pressed", "true");
});

test("the selected ring uses a real theme token", () => {
  // Tailwind v4 `@theme` exposes the rust as `--color-brand`; there is no
  // `--brand`, and an undefined var renders no ring at all — the selected
  // state would be invisible.
  const { container } = render(<ColorPicker value={["navy"]} onChange={() => {}} />);
  const selected = screen.getByRole("button", { name: /navy/i });
  expect(selected.className).toContain("var(--color-brand)");
  expect(container.innerHTML).not.toContain("var(--brand)");
});
