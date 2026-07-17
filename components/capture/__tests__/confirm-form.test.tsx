import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmForm } from "../confirm-form";
import type { Draft } from "../use-capture";

const draft: Draft = {
  imagePath: "p",
  cutoutPath: "c",
  cutoutUrl: "blob:x",
  name: "Tee",
  brand: "",
  tags: {
    category: "Tops", subcategory: "Tee", colors: ["black"],
    pattern: "solid", material: "Cotton", formality: 2, seasons: ["Summer"],
  },
};

test("renders the draft name and fires onSave", async () => {
  const onSave = vi.fn();
  render(
    <ConfirmForm
      draft={draft}
      saving={false}
      error={null}
      onDraft={() => {}}
      onTags={() => {}}
      onToggleSeason={() => {}}
      onSave={onSave}
    />,
  );
  expect(screen.getByDisplayValue("Tee")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /add to closet/i }));
  expect(onSave).toHaveBeenCalledOnce();
});
