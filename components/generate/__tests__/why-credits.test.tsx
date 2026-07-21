import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhyQuote } from "../why-quote";
import { Credits } from "../credits";
import type { LookPiece } from "@/lib/generator/types";

const slot = { xPct: 0, yPct: 0, wPct: 10, hPct: 10, rotationDeg: 0, z: 1 };
const piece = (over: Partial<LookPiece>): LookPiece => ({
  itemId: "x",
  category: "Tops",
  subcategory: null,
  brand: null,
  name: null,
  colors: [],
  cutoutUrl: "",
  slot,
  ...over,
});

test("why: renders the reasoning led by a rust 'f' glyph, with the name in muted-foreground (D5/D2/D3)", () => {
  render(<WhyQuote name="The Off-Duty Camel" why="the camel coat does the talking" />);
  expect(screen.getByText(/camel coat does the talking/i)).toBeInTheDocument();
  expect(screen.getByText("f")).toHaveClass("bg-brand");
  expect(screen.getByText("The Off-Duty Camel")).toHaveClass("text-muted-foreground");
});

test("credits: brand names are the most readable (D2 reversal), separator muted, segment opens item", async () => {
  const onOpenItem = vi.fn();
  render(
    <Credits
      pieces={[
        piece({ itemId: "i1", category: "Outerwear", brand: "Uniqlo U", name: "Camel coat" }),
        piece({ itemId: "i2", category: "Tops", brand: "COS", name: "Cream knit" }),
      ]}
      onOpenItem={onOpenItem}
    />,
  );
  expect(screen.getByText("Uniqlo U")).toHaveClass("text-foreground", "font-semibold");
  expect(screen.getByText("·")).toHaveClass("text-muted-dim");
  const segment = screen.getByRole("button", { name: /Camel coat/ });
  expect(segment).toHaveClass("min-h-11");
  await userEvent.click(segment);
  expect(onOpenItem).toHaveBeenCalledWith("i1");
});
