import { render, screen } from "@testing-library/react";
import { Surface } from "../surface";

test("applies the design's card gradient and keeps the card radius", () => {
  render(<Surface data-testid="s">x</Surface>);
  const el = screen.getByTestId("s");
  expect(el).toHaveClass("surface-card", "rounded-[14px]");
});

test("no flat fill — the design never fills a raised surface with a solid colour", () => {
  // `.surface-card` (globals.css @layer components) carries BOTH the gradient
  // and its inset hairline. A `bg-*` utility alongside it would win on layer
  // order — utilities come after components in Tailwind v4 — and silently
  // restore the flat fill this replaced.
  render(<Surface data-testid="s">x</Surface>);
  const el = screen.getByTestId("s");
  expect(el.className).not.toMatch(/\bbg-surface-1\b/);
  expect(el.className).not.toMatch(/shadow-\[inset/);
});

test("callers can still add layout classes without losing the surface", () => {
  render(
    <Surface data-testid="s" className="overflow-hidden">
      x
    </Surface>,
  );
  const el = screen.getByTestId("s");
  expect(el).toHaveClass("surface-card", "overflow-hidden");
});
