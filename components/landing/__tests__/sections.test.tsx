import { render, screen, within } from "@testing-library/react";
import enUS from "@/messages/en-US.json";
import { EXAMPLE_CLOSET, STARTER_PIECES } from "@/lib/landing/example-looks";
import { ExampleSection } from "../example-section";
import { HowItWorks } from "../how-it-works";

test("how it works is a real three-step sequence and says the first step is five photos", async () => {
  render(await HowItWorks());
  const steps = within(screen.getByRole("list")).getAllByRole("listitem");
  expect(steps).toHaveLength(3);
  expect(steps[0]).toHaveTextContent(enUS.home.how.steps.add.title);
  expect(screen.getByText(new RegExp(`adding ${STARTER_PIECES} pieces`))).toBeInTheDocument();
});

test("the example shows the nine-piece closet, marks the look's pieces and translates the tags", async () => {
  render(await ExampleSection());
  const grid = screen.getByRole("list", { name: enUS.closet.title });
  expect(within(grid).getAllByRole("img")).toHaveLength(EXAMPLE_CLOSET.length);
  expect(screen.getAllByAltText(`${enUS.home.pieces.navySweater}, in today's look`).length).toBeGreaterThan(0);
  expect(within(grid).getByAltText(enUS.home.pieces.blueShirt)).toBeInTheDocument();
  // Stored vocabulary is translated at display; the capital letter is CSS, so the text is the catalogue's own.
  for (const tag of ["navy", "Wool", "Fine knit", "Autumn", "Winter"]) expect(screen.getByText(tag)).toBeInTheDocument();
  expect(screen.getByText(enUS.home.looks.quietNavy.why)).toBeInTheDocument();
  expect(screen.getByText(enUS.home.example.caption)).toBeInTheDocument();
});
