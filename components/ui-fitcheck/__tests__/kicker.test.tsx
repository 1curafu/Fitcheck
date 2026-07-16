import { render, screen } from "@testing-library/react";
import { Kicker } from "../kicker";

test("renders its text uppercase-tracked and muted by default", () => {
  render(<Kicker>19 Pieces</Kicker>);
  const el = screen.getByText("19 Pieces");
  expect(el).toHaveClass("uppercase", "tracking-[0.22em]", "text-muted-dim");
});

test("brand variant uses the brand colour and wider tracking", () => {
  render(<Kicker variant="brand">Your AI Stylist</Kicker>);
  const el = screen.getByText("Your AI Stylist");
  expect(el).toHaveClass("text-brand", "tracking-[0.34em]");
});
