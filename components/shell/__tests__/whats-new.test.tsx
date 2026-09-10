import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhatsNew, shouldShow } from "../whats-new";
import { CURRENT_RELEASE } from "@/lib/release-notes";

const KEY = "fitcheck:last-seen-release";

beforeEach(() => localStorage.clear());

test("a returning user on an older release sees what changed", async () => {
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  expect(await screen.findByText(CURRENT_RELEASE.headline)).toBeInTheDocument();
});

test("a brand-new user is told nothing, and starts from this release", async () => {
  // ⚠️ Nobody's first impression should be a list of repairs. Seeding on the
  // first run is what makes the NEXT release their first note.
  render(<WhatsNew />);
  await waitFor(() => expect(localStorage.getItem(KEY)).toBe(CURRENT_RELEASE.version));
  expect(screen.queryByText(CURRENT_RELEASE.headline)).not.toBeInTheDocument();
});

test("someone already on this release sees nothing", async () => {
  localStorage.setItem(KEY, CURRENT_RELEASE.version);
  render(<WhatsNew />);
  await waitFor(() => expect(localStorage.getItem(KEY)).toBe(CURRENT_RELEASE.version));
  expect(screen.queryByText(CURRENT_RELEASE.headline)).not.toBeInTheDocument();
});

test("dismissing it is remembered, so it never returns for this release", async () => {
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  await userEvent.click(await screen.findByRole("button", { name: /dismiss what's new/i }));
  expect(screen.queryByText(CURRENT_RELEASE.headline)).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBe(CURRENT_RELEASE.version);
});

test("it does not block the screen it appears on", async () => {
  // ⚠️ The reason this is a card and not a sheet: /generate is what people open
  // the app FOR. A modal would stand between them and their looks.
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  await screen.findByText(CURRENT_RELEASE.headline);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("storage being unavailable costs the user nothing", async () => {
  // Private windows and blocked site data throw on ACCESS, not on write.
  const spy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<WhatsNew />);
  await waitFor(() => expect(screen.queryByText(CURRENT_RELEASE.headline)).not.toBeInTheDocument());
  spy.mockRestore();
});

test("it announces the update in one line, not a changelog", async () => {
  // ⚠️ The first build rendered every entry and took 55% of the phone, pushing
  // "Today's Looks" below the fold — the modal this card exists to avoid, just
  // without a backdrop.
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  await screen.findByText(CURRENT_RELEASE.headline);
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(screen.queryByText(CURRENT_RELEASE.added[0])).not.toBeInTheDocument();
});

test("tapping it opens the full list — nothing written is unreachable", async () => {
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  await userEvent.click(await screen.findByRole("button", { expanded: false }));
  for (const item of [...CURRENT_RELEASE.added, ...CURRENT_RELEASE.fixed]) {
    expect(screen.getByText(item)).toBeInTheDocument();
  }
});

test("what is new and what is fixed are told apart", async () => {
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  await userEvent.click(await screen.findByRole("button", { expanded: false }));
  expect(screen.getByText("New")).toBeInTheDocument();
  expect(screen.getByText("Fixed")).toBeInTheDocument();
});

test("it can be closed again without dismissing it", async () => {
  localStorage.setItem(KEY, "0.0.1");
  render(<WhatsNew />);
  const toggle = await screen.findByRole("button", { expanded: false });
  await userEvent.click(toggle);
  await userEvent.click(screen.getByRole("button", { expanded: true }));
  expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  expect(screen.getByText(CURRENT_RELEASE.headline)).toBeInTheDocument();
});

test("who is owed the note", () => {
  // See `shouldShow` — the null case cannot be asserted through the DOM.
  expect(shouldShow(null, "0.2.0")).toBe(false); // brand new: nothing to catch up on
  expect(shouldShow("0.1.0", "0.2.0")).toBe(true);
  expect(shouldShow("0.2.0", "0.2.0")).toBe(false);
});
