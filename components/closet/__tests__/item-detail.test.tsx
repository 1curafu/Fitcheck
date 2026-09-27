import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemDetail, type DetailItem } from "../item-detail";
// The upgrade sheet imports the billing Server Actions (server-only); a rendering test never calls Stripe.
vi.mock("@/app/billing/actions", () => ({ startCheckout: vi.fn(), openBillingPortal: vi.fn() }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh }),
}));

vi.mock("@/app/[locale]/closet/[itemId]/style-actions", () => ({ styleWithItem: vi.fn() }));

const updateItem = vi.fn().mockResolvedValue(undefined);
const archiveItem = vi.fn().mockResolvedValue(undefined);
const eraseOriginal = vi.fn();
const restoreItem = vi.fn();
const deletePiece = vi.fn();
vi.mock("@/app/[locale]/closet/[itemId]/actions", () => ({
  updateItem: (...args: unknown[]) => updateItem(...args),
  archiveItem: (...args: unknown[]) => archiveItem(...args),
  eraseOriginal: (...args: unknown[]) => eraseOriginal(...args),
  restoreItem: (...args: unknown[]) => restoreItem(...args),
  deletePiece: (...args: unknown[]) => deletePiece(...args),
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
  accent_color: null,
  branding: null,
  fit: null,
  fit_source: null,
  length: null,
  bulk: null,
  distressing: null,
};

function renderDetail(itemOverrides: Partial<DetailItem> = {}, props: { archived?: boolean; canEraseOriginal?: boolean } = {}) {
  return render(
    <ItemDetail
      item={{ ...item, ...itemOverrides }}
      imageUrl="/i1.png"
      brandSuggestions={[]}
      stats={{ wears: 30, costPerWear: "€3.00", lastWorn: "Yesterday" }}
      goesWith={[]}
      archived={props.archived ?? false}
      canEraseOriginal={props.canEraseOriginal ?? true}
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

// Every tag that can be set at capture must be correctable afterwards, or the
// closet becomes a place where mistakes are permanent — the six fields the
// item-data-completeness plan added (fit, branding, accent colour, length,
// bulk/sole, distressing) need a way back.
test("the edit screen offers every new field", async () => {
  // Tops, not Shoes: Task 5 hides Fit/Length on footwear, so a category that
  // can carry every field being asserted here is required.
  renderDetail({ category: "Tops", fit: "Regular" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.getByLabelText("Fit")).toBeInTheDocument();
  expect(screen.getByLabelText("Branding")).toBeInTheDocument();
  expect(screen.getByLabelText("Accent colour")).toBeInTheDocument();
  expect(screen.getByLabelText("Length")).toBeInTheDocument();
  // ⚠️ `distressing` is AI-tagged and never asked at capture, so THIS is its
  // only correction path. Without it the field is write-once and a wrong tag
  // is permanent — the exact failure this task exists to prevent.
  expect(screen.getByLabelText("Wear")).toBeInTheDocument();
});

test("sole is offered for shoes and hidden for everything else", async () => {
  renderDetail({ category: "Shoes" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.getByLabelText("Sole")).toBeInTheDocument();

  cleanup();
  updateItem.mockClear();
  renderDetail({ category: "Tops" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.queryByLabelText("Sole")).not.toBeInTheDocument();
});

test("the update action carries fit, branding, accent colour, length and wear", async () => {
  // Tops, not Shoes: Fit and Length no longer coexist with Sole on one item,
  // so this covers the five wearable-category fields; Sole gets its own test.
  updateItem.mockClear();
  renderDetail({ category: "Tops" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));

  await userEvent.click(screen.getByRole("button", { name: "Oversized" }));
  await userEvent.selectOptions(screen.getByLabelText("Branding"), "Large");
  await userEvent.selectOptions(screen.getByLabelText("Length"), "Cropped");
  await userEvent.selectOptions(screen.getByLabelText("Wear"), "Ripped");
  await userEvent.click(screen.getByRole("button", { name: /^sky$/i }));
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith(
    "i1",
    expect.objectContaining({
      fit: "Oversized",
      branding: "Large",
      accent_color: "sky",
      length: "Cropped",
      distressing: "Ripped",
      bulk: null,
    }),
  );
});

test("the update action carries bulk for a shoe", async () => {
  updateItem.mockClear();
  renderDetail({ category: "Shoes" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));

  await userEvent.selectOptions(screen.getByLabelText("Sole"), "Low profile");
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith(
    "i1",
    expect.objectContaining({ bulk: "Low profile", fit: null, fit_source: null, length: null }),
  );
});

// ── Task 5: fit and length are body-referenced — a shoe has neither ─────────

test("a shoe is not asked for fit or length; a top is, but not for sole", async () => {
  renderDetail({ category: "Shoes" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.queryByLabelText("Fit")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Length")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Sole")).toBeInTheDocument();

  cleanup();
  updateItem.mockClear();
  renderDetail({ category: "Tops" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(screen.getByLabelText("Fit")).toBeInTheDocument();
  expect(screen.getByLabelText("Length")).toBeInTheDocument();
  expect(screen.queryByLabelText("Sole")).not.toBeInTheDocument();
});

// ⚠️ Hiding the control is not enough — state survives behind it. `bulk`
// needed the same write-time guard in `save()` for the same reason.
test("the save guard nulls fit, fit_source and length when the category switches to Shoes, even though the controls were set before the switch", async () => {
  updateItem.mockClear();
  renderDetail({ category: "Tops", fit: "Relaxed", fit_source: "user", length: "Hip" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  await userEvent.click(screen.getByRole("button", { name: "Shoes" }));
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith(
    "i1",
    expect.objectContaining({ fit: null, fit_source: null, length: null }),
  );
});

// `distressing` doubles as the backfill script's "has this row been through
// the tagger" sentinel (scripts/backfill-styling-tags.ts). It already has a
// real value for "no wear" — None — so "Not set" must not be offered here,
// unlike Branding/Length/Sole where null is a genuine answer.
test("Wear has no way to set an unset answer, unlike Branding, Length and Sole", async () => {
  // Tops: Branding and Length coexist here (Length no longer renders on Shoes).
  renderDetail({ category: "Tops" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));

  const wear = within(screen.getByLabelText("Wear"));
  expect(wear.getByRole("option", { name: "None" })).toBeInTheDocument();
  expect(wear.queryByRole("option", { name: "Not set" })).not.toBeInTheDocument();

  expect(within(screen.getByLabelText("Branding")).getByRole("option", { name: "Not set" })).toBeInTheDocument();
  expect(within(screen.getByLabelText("Length")).getByRole("option", { name: "Not set" })).toBeInTheDocument();

  cleanup();
  // Sole only renders for Shoes.
  renderDetail({ category: "Shoes" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  expect(within(screen.getByLabelText("Sole")).getByRole("option", { name: "Not set" })).toBeInTheDocument();
});

test("tapping the selected fit chip clears it back to unset", async () => {
  // `fit` is the user's answer, and "I don't know" is a legitimate answer —
  // a later plan measures how many items have a real value, so an accidental
  // tap must be undoable or that measurement counts taps nobody meant.
  renderDetail({ fit: "Relaxed" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  await userEvent.click(screen.getByRole("button", { name: "Relaxed" }));
  expect(screen.getByRole("button", { name: "Relaxed" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

// ── Task 3: changing fit in the edit sheet is a human decision ──────────────

test("changing the fit in the edit sheet records fit_source as the user's", async () => {
  updateItem.mockClear();
  renderDetail({ fit: "Relaxed", fit_source: "model" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  await userEvent.click(screen.getByRole("button", { name: "Oversized" }));
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith(
    "i1",
    expect.objectContaining({ fit: "Oversized", fit_source: "user" }),
  );
});

test("clearing the fit via the toggle clears fit_source too, not a stale 'user'", async () => {
  updateItem.mockClear();
  renderDetail({ fit: "Relaxed", fit_source: "user" });
  await userEvent.click(screen.getByRole("button", { name: /more/i }));
  // Tapping the already-selected chip toggles it off.
  await userEvent.click(screen.getByRole("button", { name: "Relaxed" }));
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));

  expect(updateItem).toHaveBeenCalledWith(
    "i1",
    expect.objectContaining({ fit: null, fit_source: null }),
  );
});

describe("removing a piece", () => {
  beforeEach(() => archiveItem.mockClear());

  test("asks in an app sheet, never the browser's confirm()", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));

    const sheet = screen.getByRole("dialog", { name: /remove this piece/i });
    expect(sheet).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(archiveItem).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test("says honestly what removing does and does not do", async () => {
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    const sheet = screen.getByRole("dialog", { name: /remove this piece/i });

    expect(within(sheet).getByText(/leaves your closet and won.t appear in new looks/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/past looks and your wear history keep it/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/you can put it back from removed pieces/i)).toBeInTheDocument();
  });

  test("cancel and escape close the sheet without removing anything", async () => {
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(archiveItem).not.toHaveBeenCalled();
  });

  test("the sheet's own button removes the piece", async () => {
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove from closet/i }));
    expect(archiveItem).toHaveBeenCalledWith("i1");
  });

  test("erase is a second, confirmed step that calls eraseOriginal", async () => {
    eraseOriginal.mockReset().mockResolvedValue(undefined);
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove and erase original photo/i }));
    const confirm = screen.getByRole("dialog", { name: /erase the original photo/i });
    expect(within(confirm).getByText(/cut-out garment stays in your past looks/i)).toBeInTheDocument();
    expect(within(confirm).getByText(/encrypted backups expire within 30 days/i)).toBeInTheDocument();
    expect(eraseOriginal).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole("button", { name: /^erase original$/i }));
    expect(eraseOriginal).toHaveBeenCalledWith("i1");
  });

  test("Back returns from the erase step without erasing", async () => {
    eraseOriginal.mockReset();
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove and erase original photo/i }));
    // Scoped to the dialog: ItemView's own floating control is also named "Back" (item-view.tsx:100).
    const confirm = screen.getByRole("dialog", { name: /erase the original photo/i });
    await userEvent.click(within(confirm).getByRole("button", { name: /^back$/i }));
    expect(screen.getByRole("dialog", { name: /remove this piece/i })).toBeInTheDocument();
    expect(eraseOriginal).not.toHaveBeenCalled();
  });

  test("a failed erase keeps the sheet open with the retry message", async () => {
    eraseOriginal.mockReset().mockResolvedValue({ status: "error", message: "Couldn't erase the photo. Nothing was changed — try again." });
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove and erase original photo/i }));
    await userEvent.click(screen.getByRole("button", { name: /^erase original$/i }));
    expect(await screen.findByText(/couldn.t erase the photo/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /erase the original photo/i })).toBeInTheDocument();
  });

  test("an unavailable erase shows its reason in the sheet", async () => {
    eraseOriginal.mockReset().mockResolvedValue({ status: "unavailable", message: "This photo was already erased." });
    renderDetail();
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    await userEvent.click(screen.getByRole("button", { name: /remove and erase original photo/i }));
    await userEvent.click(screen.getByRole("button", { name: /^erase original$/i }));
    expect(await screen.findByText("This photo was already erased.")).toBeInTheDocument();
  });

  test("a piece without a cut-out, or already erased, is never offered the erase", async () => {
    renderDetail({}, { canEraseOriginal: false });
    await userEvent.click(screen.getByRole("button", { name: /archive/i }));
    expect(screen.queryByRole("button", { name: /erase original photo/i })).not.toBeInTheDocument();
  });
});

describe("a removed piece", () => {
  beforeEach(() => { restoreItem.mockReset(); refresh.mockClear(); });

  test("says it was removed, offers Put back, and hides Remove and the Style CTA", () => {
    renderDetail({}, { archived: true });
    const note = screen.getByText(/removed from your closet/i);
    // The only text saying the piece is removed: it must meet 4.5:1 (DESIGN.md: muted-dim is decorative only).
    expect(note).not.toHaveClass("text-muted-dim");
    expect(note).toHaveClass("text-muted-foreground");
    expect(screen.getByRole("button", { name: /put back/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /style/i })).not.toBeInTheDocument();
  });

  test("Put back restores and refreshes", async () => {
    restoreItem.mockResolvedValue({ status: "restored" });
    renderDetail({}, { archived: true });
    await userEvent.click(screen.getByRole("button", { name: /put back/i }));
    expect(restoreItem).toHaveBeenCalledWith("i1");
    expect(refresh).toHaveBeenCalled();
  });

  test("a full Free closet opens the upgrade sheet with the limit message", async () => {
    restoreItem.mockResolvedValue({ status: "limited", message: "Free closets hold 50 pieces" });
    renderDetail({}, { archived: true });
    await userEvent.click(screen.getByRole("button", { name: /put back/i }));
    expect(await screen.findByText("Free closets hold 50 pieces")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("still offers erasing the original, straight into the confirm step", async () => {
    renderDetail({}, { archived: true, canEraseOriginal: true });
    await userEvent.click(screen.getByRole("button", { name: /erase original photo/i }));
    expect(screen.getByRole("dialog", { name: /erase the original photo/i })).toBeInTheDocument();
  });

  test("an erased piece offers Put back and Delete for good, but no erase", () => {
    renderDetail({}, { archived: true, canEraseOriginal: false });
    expect(screen.queryByRole("button", { name: /erase original photo/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /put back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete for good/i })).toBeInTheDocument();
  });

  test("Delete for good confirms in its own step, says what goes and what stays, then calls deletePiece", async () => {
    deletePiece.mockReset().mockResolvedValue(undefined);
    renderDetail({}, { archived: true });
    await userEvent.click(screen.getByRole("button", { name: /delete for good/i }));
    const sheet = screen.getByRole("dialog", { name: /delete this piece for good/i });
    expect(within(sheet).getByText(/photos, cut-out and details are deleted/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/past looks, your calendar and trips keep their other pieces/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/can.t be undone/i)).toBeInTheDocument();
    expect(deletePiece).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole("button", { name: /^delete for good$/i }));
    expect(deletePiece).toHaveBeenCalledWith("i1");
  });

  test("Back from the delete step deletes nothing", async () => {
    deletePiece.mockReset();
    renderDetail({}, { archived: true });
    await userEvent.click(screen.getByRole("button", { name: /delete for good/i }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /back/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deletePiece).not.toHaveBeenCalled();
  });

  test("a failed delete keeps the sheet open with its message", async () => {
    deletePiece.mockReset().mockResolvedValue({ status: "error", message: "Couldn't delete the piece. Nothing was changed — try again." });
    renderDetail({}, { archived: true });
    await userEvent.click(screen.getByRole("button", { name: /delete for good/i }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^delete for good$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t delete the piece/i);
    expect(screen.getByRole("dialog", { name: /delete this piece for good/i })).toBeInTheDocument();
  });
});

test("a piece still in the closet is never offered Delete for good", () => {
  renderDetail({}, { archived: false });
  expect(screen.queryByRole("button", { name: /delete for good/i })).not.toBeInTheDocument();
});
