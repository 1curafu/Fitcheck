import { render, screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { expect, it } from "vitest";
import { renderInLocale } from "./render";

function Probe() {
  const t = useTranslations("notFound");
  return <p>{t("title")}</p>;
}

it("components render real en-US copy by default", () => {
  render(<Probe />);
  expect(screen.getByText("Nothing here")).toBeInTheDocument();
});

it("a test can render in Ukrainian", async () => {
  await renderInLocale(<Probe />, "uk");
  expect(screen.getByText("Тут нічого немає")).toBeInTheDocument();
});
