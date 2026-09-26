import { render, screen } from "@testing-library/react";
import { ProgressStrip } from "../progress-strip";

test("renders 5 slots, marks the filled ones, numbers the rest", () => {
  const { container } = render(<ProgressStrip filled={2} images={[
    { src: "/first.webp", name: "Navy sweater" },
    { src: "/second.webp", name: "White shirt" },
  ]} />);
  expect(container.querySelectorAll("[data-filled]")).toHaveLength(5);
  expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Navy sweater" })).toHaveAttribute("src", "/first.webp");
  expect(screen.getByRole("img", { name: "White shirt" })).toHaveAttribute("src", "/second.webp");
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.queryByText("1")).not.toBeInTheDocument();
});

test("renders one scrollable saved-only slot per selected batch photo", () => {
  const { container } = render(<ProgressStrip filled={1} total={10} images={[
    { src: "/saved.webp", name: "Saved shirt" },
  ]} />);
  expect(container.querySelectorAll("[data-filled]")).toHaveLength(10);
  expect(screen.getByRole("img", { name: "Saved shirt" })).toBeInTheDocument();
  expect(screen.getByText("10")).toBeInTheDocument();
  expect(container.firstElementChild).toHaveClass("overflow-x-auto");
});
