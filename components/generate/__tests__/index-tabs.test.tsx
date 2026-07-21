import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndexTabs } from "../index-tabs";

test("renders 01/02/03 with names; active selected; inactive is muted-foreground NOT faint (D2/D3)", () => {
  render(<IndexTabs names={["The Camel", "Tonal Navy", "After Dark"]} selected={0} onSelect={() => {}} />);
  expect(screen.getByText("01")).toBeInTheDocument();
  expect(screen.getByText("The Camel")).toBeInTheDocument();
  const tabs = screen.getAllByRole("tab");
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  expect(tabs[1]).toHaveClass("text-muted-foreground");
  expect(tabs[1]).not.toHaveClass("text-faint", "text-muted-dim");
});

test("clicking a tab selects it", async () => {
  const onSelect = vi.fn();
  render(<IndexTabs names={["A", "B", "C"]} selected={0} onSelect={onSelect} />);
  await userEvent.click(screen.getAllByRole("tab")[1]);
  expect(onSelect).toHaveBeenCalledWith(1);
});
