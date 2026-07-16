import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip, ChipRow } from "../chip";

test("active chip is cream-filled and aria-pressed", () => {
  render(
    <Chip active onClick={() => {}}>
      Tops
    </Chip>,
  );
  const el = screen.getByRole("button", { name: "Tops" });
  expect(el).toHaveClass("bg-foreground", "text-canvas");
  expect(el).toHaveAttribute("aria-pressed", "true");
});

test("inactive chip has a hairline border and not pressed", () => {
  render(<Chip onClick={() => {}}>Bottoms</Chip>);
  const el = screen.getByRole("button", { name: "Bottoms" });
  expect(el).toHaveClass("border", "text-foreground");
  expect(el).toHaveAttribute("aria-pressed", "false");
});

test("fires onClick", async () => {
  const onClick = vi.fn();
  render(<Chip onClick={onClick}>All</Chip>);
  await userEvent.click(screen.getByRole("button", { name: "All" }));
  expect(onClick).toHaveBeenCalledOnce();
});

test("select variant is brand-tinted when active", () => {
  render(
    <Chip variant="select" active onClick={() => {}}>
      Work
    </Chip>,
  );
  const el = screen.getByRole("button", { name: "Work" });
  expect(el).toHaveClass("bg-brand/15", "text-brand-high");
});

test("ChipRow renders its children in a row", () => {
  render(
    <ChipRow>
      <Chip onClick={() => {}}>A</Chip>
      <Chip onClick={() => {}}>B</Chip>
    </ChipRow>,
  );
  expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
});
