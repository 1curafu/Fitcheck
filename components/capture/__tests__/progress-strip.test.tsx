import { render, screen } from "@testing-library/react";
import { ProgressStrip } from "../progress-strip";

test("renders 5 slots, marks the filled ones, numbers the rest", () => {
  const { container } = render(<ProgressStrip filled={2} />);
  expect(container.querySelectorAll("[data-filled]")).toHaveLength(5);
  expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(2);
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.queryByText("1")).not.toBeInTheDocument();
});
