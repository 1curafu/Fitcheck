import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemDetail, type DetailItem } from "../item-detail";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh }),
}));

const updateItem = vi.fn().mockResolvedValue(undefined);
vi.mock("@/app/closet/[itemId]/actions", () => ({
  updateItem: (...args: unknown[]) => updateItem(...args),
  archiveItem: vi.fn(),
}));

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
  seasons: ["Spring"],
};

function renderDetail() {
  return render(
    <ItemDetail
      item={item}
      imageUrl="/i1.png"
      brandSuggestions={[]}
      stats={{ wears: 30, costPerWear: "€3.00", lastWorn: "Yesterday" }}
      goesWith={[]}
    />,
  );
}

test("the screen opens on the read view, with no form in sight", () => {
  renderDetail();
  expect(screen.getByRole("heading", { name: /brushed oxford/i })).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

// The round trip the rebuild has to preserve: the tag form still saves, it has
// just moved behind `⋯`. The controls the item-data plan added must come with
// it — this asserts one of them survives the move rather than being rewritten.
test("editing opens the sheet, saves the change, and returns to the read view", async () => {
  updateItem.mockClear();
  refresh.mockClear();
  renderDetail();

  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  const sheet = screen.getByRole("dialog", { name: /edit piece/i });
  expect(sheet).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Material"), "Linen");
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith("i1", expect.objectContaining({ material: "Linen" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  // The stat tiles and tag rows are server-rendered, so a refresh is what makes
  // the new value visible — a client-side setState would not.
  expect(refresh).toHaveBeenCalled();
});

test("the price control moved across with the rest of the form", async () => {
  renderDetail();
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.getByLabelText(/price paid/i)).toHaveValue("90");
});

test("escape closes the sheet without saving", async () => {
  updateItem.mockClear();
  renderDetail();
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(updateItem).not.toHaveBeenCalled();
});
