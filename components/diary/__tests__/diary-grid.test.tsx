import { render, screen, within } from "@testing-library/react";
import { DiaryGrid } from "../diary-grid";
import { buildMonth } from "@/lib/diary/month";
import { thumbnailPieces } from "@/lib/diary/thumbnail";

const pieces = thumbnailPieces([
  { category: "Tops", imageUrl: "top.webp" },
  { category: "Bottoms", imageUrl: "btm.webp" },
  { category: "Shoes", imageUrl: "shoe.webp" },
]);

const cells = buildMonth(2026, 7, "2026-07-24", [
  { worn_on: "2026-07-09", outfitId: "o1", pieces },
]);

function renderGrid(over: Partial<React.ComponentProps<typeof DiaryGrid>> = {}) {
  return render(
    <DiaryGrid
      cells={cells}
      monthLabel="July 2026"
      streak={3}
      prevHref="/calendar?m=2026-06"
      nextHref="/calendar?m=2026-08"
      {...over}
    />,
  );
}

test("renders a Monday-first weekday header", () => {
  renderGrid();
  const header = screen.getByTestId("weekday-header");
  expect(within(header).getAllByText(/^Mon$/i)[0]).toBeInTheDocument();
  expect(within(header).getByText(/^Sun$/i)).toBeInTheDocument();
});

test("a logged day links to its outfit; an empty day does not", () => {
  renderGrid();
  expect(screen.getByRole("link", { name: /9 July/i })).toHaveAttribute("href", "/outfits/o1");
  expect(screen.queryByRole("link", { name: /10 July/i })).not.toBeInTheDocument();
});

// getByText("3") would also match the day-3 cell — scope to the pill.
test("the streak is shown with its unit", () => {
  renderGrid();
  const pill = screen.getByTestId("streak-pill");
  expect(within(pill).getByText("3")).toBeInTheDocument();
  expect(within(pill).getByText(/days/i)).toBeInTheDocument();
});

test("a zero streak is not rendered as a boast", () => {
  renderGrid({ streak: 0 });
  expect(screen.queryByTestId("streak-pill")).not.toBeInTheDocument();
});

test("a logged day renders its look as stacked cutouts", () => {
  renderGrid();
  const cell = screen.getByRole("link", { name: /9 July/i });
  expect(within(cell).getAllByRole("presentation")).toHaveLength(3);
});

// wear_logs.outfit_id is ON DELETE SET NULL, so a wear outlives its outfit.
// The day is still part of the record and the streak — it just goes nowhere.
test("a wear whose outfit is gone marks the day but is not a link", () => {
  const orphaned = buildMonth(2026, 7, "2026-07-24", [
    { worn_on: "2026-07-09", outfitId: null, pieces },
  ]);
  renderGrid({ cells: orphaned });
  expect(screen.queryByRole("link", { name: /9 July/i })).not.toBeInTheDocument();
  expect(screen.getByTestId("cell-2026-07-09")).toBeInTheDocument();
});

test("month navigation points at the neighbouring months", () => {
  renderGrid();
  expect(screen.getByRole("link", { name: /previous month/i })).toHaveAttribute(
    "href",
    "/calendar?m=2026-06",
  );
  expect(screen.getByRole("link", { name: /next month/i })).toHaveAttribute(
    "href",
    "/calendar?m=2026-08",
  );
});

test("the month label and title head the screen", () => {
  renderGrid();
  expect(screen.getByText("July 2026")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /fit diary/i })).toBeInTheDocument();
});

// A month with nothing logged must explain itself rather than show a bare grid.
test("an empty month explains where entries come from", () => {
  renderGrid({ cells: buildMonth(2026, 7, "2026-07-24", []) });
  expect(screen.getByText(/wear a look/i)).toBeInTheDocument();
});

test("a month with wears does not show the empty-state footnote", () => {
  renderGrid();
  expect(screen.queryByText(/wear a look/i)).not.toBeInTheDocument();
});
