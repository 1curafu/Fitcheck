import { render, screen } from "@testing-library/react";
import { ItemView } from "../item-view";
import type { DetailItem } from "../item-detail";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

const item: DetailItem = {
  id: "i1",
  name: "Brushed Oxford",
  brand: "Hartley",
  category: "Tops",
  subcategory: "Oxford shirt",
  colors: ["cream"],
  material: "Cotton",
  texture: "Flat",
  pattern: "solid",
  price: 90,
  formality: 3,
  seasons: ["Spring", "Autumn"],
};

const noop = () => {};

function renderView(over: Partial<React.ComponentProps<typeof ItemView>> = {}) {
  return render(
    <ItemView
      item={item}
      imageUrl="/i1.png"
      stats={{ wears: 30, costPerWear: "€3.00", lastWorn: "Yesterday" }}
      goesWith={[{ id: "i2", name: "Camel Overshirt", imageUrl: "/i2.png" }]}
      onEdit={noop}
      onArchive={noop}
      {...over}
    />,
  );
}

test("brand, name and subcategory · colour lead the screen", () => {
  renderView();
  expect(screen.getByText(/hartley/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /brushed oxford/i })).toBeInTheDocument();
  expect(screen.getByText(/oxford shirt · cream/i)).toBeInTheDocument();
});

test("the three wear tiles render", () => {
  renderView();
  expect(screen.getByText(/times worn/i)).toBeInTheDocument();
  expect(screen.getByText(/cost \/ wear/i)).toBeInTheDocument();
  expect(screen.getByText(/last worn/i)).toBeInTheDocument();
});

test("the cost-per-wear tile is hidden when there is no price", () => {
  renderView({ stats: { wears: 30, costPerWear: null, lastWorn: "Yesterday" } });
  expect(screen.queryByText(/cost \/ wear/i)).not.toBeInTheDocument();
  // …and the tiles that DO have an answer still render.
  expect(screen.getByText(/times worn/i)).toBeInTheDocument();
});

test("tag rows show every stored tag as a label/value pair", () => {
  renderView();
  for (const k of ["Category", "Colour", "Material", "Texture", "Seasons"]) {
    expect(screen.getByText(k)).toBeInTheDocument();
  }
  // Multi-values join with the design's separator, never a bare array.
  expect(screen.getByText("Spring · Autumn")).toBeInTheDocument();
});

test("formality is stated in words, not as a bare number", () => {
  renderView();
  expect(screen.getByText(/smart casual/i)).toBeInTheDocument();
});

test("goes-with pieces link to their own detail", () => {
  renderView();
  expect(screen.getByRole("link", { name: /camel overshirt/i })).toHaveAttribute(
    "href",
    "/closet/i2",
  );
});

// An empty row is better than a fabricated one — a one-item closet has nothing
// to suggest, and the heading alone would read as a loading failure.
test("the goes-with section is absent when there is nothing to suggest", () => {
  renderView({ goesWith: [] });
  expect(screen.queryByText(/goes with/i)).not.toBeInTheDocument();
});

test("editing is behind the overflow control, not inline", () => {
  renderView();
  expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
