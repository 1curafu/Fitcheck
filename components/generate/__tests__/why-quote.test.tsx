import { render, screen } from "@testing-library/react";
import { WhyQuote } from "../why-quote";

// The credit line that used to live beside the why was removed on 2026-07-30 —
// the outfit detail screen now carries the piece list, with each row opening the
// same garment page. Its D2 test (brand names the most readable) went with it.

test("why: renders the reasoning led by a rust 'f' glyph, with the name in muted-foreground (D5/D2/D3)", () => {
  render(<WhyQuote name="The Off-Duty Camel" why="the camel coat does the talking" />);
  expect(screen.getByText(/camel coat does the talking/i)).toBeInTheDocument();
  expect(screen.getByText("f")).toHaveClass("bg-brand");
  expect(screen.getByText("The Off-Duty Camel")).toHaveClass("text-muted-foreground");
});
