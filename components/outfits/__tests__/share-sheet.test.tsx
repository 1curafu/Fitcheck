import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { CardInput } from "@/lib/share/card-layout";

const actions = vi.hoisted(() => ({ prepareShare: vi.fn(), publishShare: vi.fn(), stopSharing: vi.fn(), getShareState: vi.fn() }));
vi.mock("@/app/[locale]/outfits/[id]/share-actions", () => actions);
const upload = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: () => ({ upload }) } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const r = vi.hoisted(() => ({
  loadFonts: vi.fn(async () => ({ serif: "serif", sans: "sans" })),
  loadImages: vi.fn(async (ps: { n: number }[]) => new Map(ps.map((p) => [p.n, {} as HTMLImageElement]))),
  renderCard: vi.fn(async (_t: string, _input: CardInput, ..._rest: unknown[]) => new Blob(["x"], { type: "image/jpeg" })),
}));
vi.mock("@/lib/share/render", () => r);

import { ShareSheet } from "../share-sheet";

const outfit = { id: "77777777-7777-4777-8777-777777777777", lookName: "Quiet Camel", occasion: "everyday", reasoning: "Why.", lookDate: "2026-09-26" };
const slot = { xPct: 10, yPct: 10, wPct: 30, hPct: 40, rotationDeg: 0, z: 1 };
const pieces = [
  { id: "b", name: "Cream knit", brand: " Hartley ", category: "Tops", imageUrl: "https://x/b", slot },
  { id: "a", name: "Camel overcoat", brand: null, category: "Outerwear", imageUrl: "https://x/a", slot },
];
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";
let share: ReturnType<typeof vi.fn>;
let click: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Object.values(actions).forEach((f) => f.mockReset());
  actions.getShareState.mockResolvedValue(null);
  upload.mockReset().mockResolvedValue({ error: null });
  r.renderCard.mockClear();
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
  share = vi.fn(async () => {});
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
  click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

const open = async () => {
  render(<ShareSheet outfit={outfit} pieces={pieces} onClose={() => {}} />);
  const sheet = await screen.findByRole("dialog", { name: /share this look/i });
  await waitFor(() => expect(within(sheet).getByRole("button", { name: /share image/i })).toBeEnabled());
  return sheet;
};

test("Share image downloads the rendered card and never touches the public share actions", async () => {
  const sheet = await open();
  await userEvent.click(within(sheet).getByRole("button", { name: /share image/i }));
  expect(click).toHaveBeenCalled();
  expect(actions.prepareShare).not.toHaveBeenCalled();
  expect(upload).not.toHaveBeenCalled();
});

test("tapping the selected format keeps its ready image available", async () => {
  const sheet = await open();
  await userEvent.click(within(sheet).getByRole("radio", { name: "Story" }));
  expect(within(sheet).getByRole("button", { name: /share image/i })).toBeEnabled();
});

test("Share image calls navigator.share synchronously with the cached file (iOS user activation)", async () => {
  Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
  Object.defineProperty(navigator, "share", { value: share, configurable: true });
  const sheet = await open();
  const renders = r.renderCard.mock.calls.length;
  fireEvent.click(within(sheet).getByRole("button", { name: /share image/i }));
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
  expect(r.renderCard.mock.calls.length).toBe(renders); // no render between the tap and the share call
});

test("the card numbers pieces in reading order, and brands follow the snapshot rules", async () => {
  const sheet = await open();
  expect(r.renderCard.mock.calls.at(-1)![1].pieces.map((p) => p.label)).toEqual(["Camel overcoat", "Cream knit"]);
  await userEvent.click(within(sheet).getByRole("switch", { name: /show brands/i }));
  await waitFor(() => expect(r.renderCard.mock.calls.at(-1)![1].pieces.map((p) => p.label)).toEqual(["Camel overcoat", "Cream knit — Hartley"]));
});

test("Create link prepares, uploads the three images with a short cache, publishes, then offers Share and Copy", async () => {
  actions.prepareShare.mockResolvedValue({ status: "ok", token: TOKEN, text: { name: outfit.lookName, why: outfit.reasoning } });
  actions.publishShare.mockResolvedValue({ status: "published" });
  const sheet = await open();
  await userEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  await waitFor(() => expect(actions.publishShare).toHaveBeenCalledWith(TOKEN));
  expect(actions.prepareShare).toHaveBeenCalledWith({ outfitId: outfit.id, showBrands: false });
  expect(upload.mock.calls.map((c) => c[0])).toEqual([`${TOKEN}/story.jpg`, `${TOKEN}/post.jpg`, `${TOKEN}/og.jpg`]);
  expect(upload.mock.calls.every((c) => c[2].cacheControl === "60" && c[2].contentType === "image/jpeg")).toBe(true);
  expect(await within(sheet).findByTestId("share-url")).toHaveTextContent(`/l/${TOKEN}`);
  expect(within(sheet).getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
  expect(within(sheet).getByText(/anyone with the link can see this look/i)).toBeInTheDocument();
});

test("all three uploaded cards use authoritative prepared text when the preview was older", async () => {
  const text = { name: "Тихий ранок", why: "Затишний образ." };
  actions.prepareShare.mockResolvedValue({ status: "ok", token: TOKEN, text });
  actions.publishShare.mockResolvedValue({ status: "published" });
  const sheet = await open();
  expect(r.renderCard.mock.calls.at(-1)![1].title).toBe(outfit.lookName);
  r.renderCard.mockClear();
  await userEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  await within(sheet).findByTestId("share-url");
  expect(r.renderCard.mock.calls.map(call => [call[0], call[1].title, call[1].why])).toEqual([
    ["story", text.name, text.why], ["post", text.name, text.why], ["preview", text.name, text.why],
  ]);
});

test("a text update redraws the preview and device export without using an older cached card", async () => {
  const view = render(<ShareSheet outfit={outfit} pieces={pieces} onClose={() => {}} />);
  await waitFor(() => expect(r.renderCard).toHaveBeenCalledOnce());
  view.rerender(<ShareSheet outfit={{ ...outfit, lookName: "New words", reasoning: null }} pieces={pieces} onClose={() => {}} />);
  await waitFor(() => expect(r.renderCard).toHaveBeenCalledTimes(2));
  expect(r.renderCard.mock.calls.at(-1)![1]).toMatchObject({ title: "New words", why: null });
});

test("the cap shows its message and uploads nothing", async () => {
  actions.prepareShare.mockResolvedValue({ status: "limited", message: "share.cap", values: { limit: 100 } });
  const sheet = await open();
  await userEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  expect(await within(sheet).findByText(/up to 100 shared links/i)).toBeInTheDocument();
  expect(upload).not.toHaveBeenCalled();
});

test("an existing live link shows its expiry and can be stopped", async () => {
  actions.getShareState.mockResolvedValue({ token: TOKEN, readyAt: "2026-09-26T10:00:00.000Z" });
  actions.stopSharing.mockResolvedValue({ status: "stopped" });
  const sheet = await open();
  expect(await within(sheet).findByText(/expires oct 26/i)).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("button", { name: /stop sharing/i }));
  await waitFor(() => expect(within(sheet).queryByTestId("share-url")).not.toBeInTheDocument());
  expect(actions.stopSharing).toHaveBeenCalledWith(TOKEN);
});

test("a failed image cleanup leaves the public link off and offers a retry", async () => {
  actions.getShareState.mockResolvedValue({ token: TOKEN, readyAt: "2026-09-26T10:00:00.000Z" });
  actions.stopSharing.mockResolvedValue({ status: "error", message: "share.cleanupFailed" });
  const sheet = await open();
  expect(await within(sheet).findByTestId("share-url")).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("button", { name: /stop sharing/i }));
  await waitFor(() => expect(within(sheet).queryByTestId("share-url")).not.toBeInTheDocument());
  expect(within(sheet).getByRole("button", { name: /retry cleanup/i })).toBeInTheDocument();
  expect(within(sheet).getByRole("button", { name: /create link/i })).toBeDisabled();
});

test("a tainted canvas disables sharing with a clear message", async () => {
  r.renderCard.mockRejectedValue(new Error("SHARE_TAINTED"));
  render(<ShareSheet outfit={outfit} pieces={pieces} onClose={() => {}} />);
  const sheet = await screen.findByRole("dialog", { name: /share this look/i });
  expect(await within(sheet).findByText(/couldn.t load this look.s photos/i)).toBeInTheDocument();
  expect(within(sheet).getByRole("button", { name: /share image/i })).toBeDisabled();
  expect(within(sheet).getByRole("button", { name: /create link/i })).toBeDisabled();
  r.renderCard.mockReset().mockResolvedValue(new Blob(["x"], { type: "image/jpeg" }));
});

const withLiveLink = async () => {
  actions.getShareState.mockResolvedValue({ token: TOKEN, readyAt: "2026-09-26T10:00:00.000Z" });
  const sheet = await open();
  await within(sheet).findByTestId("share-url");
  return sheet;
};

test("Copy puts the link on the clipboard and confirms on the button itself", async () => {
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const sheet = await withLiveLink();
  fireEvent.click(within(sheet).getByRole("button", { name: /^copy$/i }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/l/${TOKEN}`));
  expect(await within(sheet).findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
});

test("Copy still works where the clipboard API is missing", async () => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  const exec = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
  const sheet = await withLiveLink();
  fireEvent.click(within(sheet).getByRole("button", { name: /^copy$/i }));
  expect(exec).toHaveBeenCalledWith("copy");
  expect(await within(sheet).findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
});

test("a failed copy says how to copy by hand, next to the link", async () => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => { throw new Error("denied"); }) }, configurable: true });
  Object.defineProperty(document, "execCommand", { value: vi.fn(() => false), configurable: true });
  const sheet = await withLiveLink();
  fireEvent.click(within(sheet).getByRole("button", { name: /^copy$/i }));
  const box = within(sheet).getByTestId("share-url").parentElement!;
  expect(await within(box).findByText(/couldn.t copy/i)).toBeInTheDocument();
});

test("Show brands explains itself and stays off when no piece has a brand", async () => {
  render(<ShareSheet outfit={outfit} pieces={pieces.map((p) => ({ ...p, brand: null }))} onClose={() => {}} />);
  const sheet = await screen.findByRole("dialog", { name: /share this look/i });
  const toggle = within(sheet).getByRole("switch", { name: /show brands/i });
  expect(toggle).toBeDisabled();
  expect(toggle).toHaveAccessibleDescription(/add a brand on a piece/i);
});

test("Create link starts the clipboard write inside the tap and fills it with the new link (iOS activation)", async () => {
  let written: Promise<Blob> | undefined;
  class FakeClipboardItem { constructor(data: Record<string, Promise<Blob>>) { written = data["text/plain"]; } }
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  const write = vi.fn(async () => { await written; });
  Object.defineProperty(navigator, "clipboard", { value: { write, writeText: vi.fn() }, configurable: true });
  let finishPrepare!: (v: unknown) => void;
  actions.prepareShare.mockReturnValue(new Promise((res) => { finishPrepare = res; }));
  actions.publishShare.mockResolvedValue({ status: "published" });
  const sheet = await open();
  fireEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  expect(write).toHaveBeenCalledTimes(1); // synchronously, before the server has answered
  finishPrepare({ status: "ok", token: TOKEN, text: { name: outfit.lookName, why: outfit.reasoning } });
  expect(await within(sheet).findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  expect(await (await written!).text()).toContain(`/l/${TOKEN}`);
  vi.unstubAllGlobals();
});

test("without ClipboardItem, Create link copies the link once it exists", async () => {
  vi.stubGlobal("ClipboardItem", undefined);
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  actions.prepareShare.mockResolvedValue({ status: "ok", token: TOKEN, text: { name: outfit.lookName, why: outfit.reasoning } });
  actions.publishShare.mockResolvedValue({ status: "published" });
  const sheet = await open();
  fireEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/l/${TOKEN}`)));
  expect(await within(sheet).findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  vi.unstubAllGlobals();
});

test("a failed Create link copies nothing", async () => {
  vi.stubGlobal("ClipboardItem", undefined);
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  actions.prepareShare.mockResolvedValue({ status: "limited", message: "share.cap", values: { limit: 100 } });
  const sheet = await open();
  fireEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  expect(await within(sheet).findByText(/up to 100 shared links/i)).toBeInTheDocument();
  expect(writeText).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
