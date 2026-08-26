import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmForm } from "../confirm-form";
import type { Draft } from "../use-capture";
import type { Tags } from "@/lib/ai/tagging-schema";

const draft: Draft = {
  imagePath: "p",
  cutoutPath: "c",
  thumbPath: null,
  cutoutUrl: "blob:x",
  name: "Tee",
  brand: "",
  tags: {
    category: "Tops", subcategory: "Crew neck tee", colors: ["black"],
    pattern: "solid", material: "Cotton", texture: "Flat",
    formality: 2, seasons: ["Summer"],
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
      onRetake={() => {}}
    />,
  );
  expect(screen.getByDisplayValue("Tee")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /add to closet/i }));
  expect(onSave).toHaveBeenCalledOnce();
});

function renderConfirm(overrides: { onTags?: (p: Partial<Tags>) => void } = {}) {
  render(
    <ConfirmForm
      draft={draft}
      saving={false}
      error={null}
      onDraft={() => {}}
      onTags={overrides.onTags ?? (() => {})}
      onToggleSeason={() => {}}
      onSave={() => {}}
      onRetake={() => {}}
    />,
  );
}

test("the confirm screen exposes every AI tag for correction", () => {
  renderConfirm();
  // CLAUDE.md: "Tags are always user-editable — treat AI tags as a draft."
  expect(screen.getByText(/colour/i)).toBeInTheDocument();
  expect(screen.getByText(/texture/i)).toBeInTheDocument();
  expect(screen.getByText(/pattern/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/subcategory/i)).toBeInTheDocument();
});

test("correcting a colour reaches the tag patch", async () => {
  const onTags = vi.fn();
  renderConfirm({ onTags });
  // The palette collapses once a colour is set (the fixture has one), so open
  // it first — 21 swatches flat took three rows of a phone screen.
  await userEvent.click(screen.getByRole("button", { name: /choose colours|hide colour palette/i }));
  await userEvent.click(screen.getByRole("button", { name: "navy" }));
  expect(onTags).toHaveBeenCalledWith(
    expect.objectContaining({ colors: expect.arrayContaining(["navy"]) }),
  );
});

test("correcting the texture reaches the tag patch", async () => {
  const onTags = vi.fn();
  renderConfirm({ onTags });
  // A select, not chips: MATERIALS (27) and TEXTURES (16) as chip rows filled
  // most of a phone screen and pushed every other field out of reach.
  await userEvent.selectOptions(screen.getByLabelText("Texture"), "Cable knit");
  expect(onTags).toHaveBeenCalledWith({ texture: "Cable knit" });
});

test("the long vocabularies are single-row selects, not chip walls", () => {
  renderConfirm();
  for (const label of ["Material", "Texture", "Pattern"]) {
    expect(screen.getByLabelText(label).tagName).toBe("SELECT");
  }
});

test("the AI-detected subcategory leads the screen, as the design specifies", () => {
  renderConfirm();
  // Fitcheck.dc.html:537-539 — "AI detected" kicker over the subcategory.
  expect(screen.getByText(/ai detected/i)).toBeInTheDocument();
});


/**
 * The escape hatch itself. Before this the screen had exactly one action, so a
 * user looking at a hole punched through their garment could only save it or
 * abandon the capture — and abandoning it stranded both uploaded blobs.
 */
test("offers a way out when the cutout is wrong", async () => {
  const onRetake = vi.fn();
  render(
    <ConfirmForm
      draft={draft}
      saving={false}
      error={null}
      onDraft={() => {}}
      onTags={() => {}}
      onToggleSeason={() => {}}
      onSave={() => {}}
      onRetake={onRetake}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /retake/i }));
  expect(onRetake).toHaveBeenCalledOnce();
});
