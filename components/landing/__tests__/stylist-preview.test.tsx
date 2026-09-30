import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import enUS from "@/messages/en-US.json";
import de from "@/messages/de.json";
import { renderInLocale } from "@/lib/i18n/__tests__/render";
import { StylistPreview } from "../stylist-preview";

test("three example looks; the tabs switch the flat lay and its why", async () => {
  render(<StylistPreview />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map((t) => t.textContent)).toEqual([
    `01${enUS.home.looks.quietNavy.name}`, `02${enUS.home.looks.blueStone.name}`, `03${enUS.home.looks.creamDenim.name}`,
  ]);
  expect(screen.getByText(enUS.home.looks.quietNavy.why)).toBeInTheDocument();
  expect(screen.getByAltText(enUS.home.pieces.navySweater)).toHaveAttribute("src", "/landing/navy-sweater.webp");

  await userEvent.click(tabs[1]);
  expect(screen.getByText(enUS.home.looks.blueStone.why)).toBeInTheDocument();
  expect(screen.getByAltText(enUS.home.pieces.blueShirt)).toBeInTheDocument();
  expect(screen.queryByAltText(enUS.home.pieces.navySweater)).not.toBeInTheDocument();
});

test("it is labelled as an example and translated", async () => {
  await renderInLocale(<StylistPreview />, "de");
  expect(screen.getByText(de.home.preview.example)).toBeInTheDocument();
  expect(screen.getByText(de.home.looks.quietNavy.why)).toBeInTheDocument();
});
