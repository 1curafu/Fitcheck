import { fireEvent, render, screen } from "@testing-library/react";
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

test("the separate batch picker passes every file in selection order", () => {
  const onMany = vi.fn();
  render(<Viewfinder busy={false} onFile={() => {}} onMany={onMany} />);
  const first = new File(["one"], "same.jpg", { type: "image/jpeg" });
  const second = new File(["two"], "same.jpg", { type: "image/jpeg" });
  const input = screen.getByLabelText("Choose several photos") as HTMLInputElement;
  expect(input).toHaveAttribute("multiple");
  fireEvent.change(input, { target: { files: [first, second] } });
  expect(onMany).toHaveBeenCalledWith([first, second]);
  expect(screen.getByRole("button", { name: "Choose several photos" })).toBeEnabled();
});
