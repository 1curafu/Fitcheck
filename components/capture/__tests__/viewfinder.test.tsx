import { render, screen } from "@testing-library/react";
import { Viewfinder } from "../viewfinder";

test("idle: shows the prompt and an enabled button", () => {
  render(<Viewfinder busy={false} onFile={() => {}} />);
  expect(screen.getByText("Tap to capture an item")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Capture an item" })).toBeEnabled();
});

test("busy: shows the removing spinner and disables the button", () => {
  render(<Viewfinder busy onFile={() => {}} />);
  expect(screen.getByText(/Cutting out/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Capture an item" })).toBeDisabled();
});
