import { render, screen } from "@testing-library/react";
import { Surface } from "../surface";

test("applies surface background and the inset hairline ring", () => {
  render(<Surface data-testid="s">x</Surface>);
  const el = screen.getByTestId("s");
  expect(el).toHaveClass("bg-surface-1", "rounded-[14px]");
});
