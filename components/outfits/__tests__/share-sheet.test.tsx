import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import type { CardInput } from "@/lib/share/card-layout";

const actions = vi.hoisted(() => ({ prepareShare: vi.fn(), publishShare: vi.fn(), stopSharing: vi.fn(), getShareState: vi.fn() }));
vi.mock("@/app/outfits/[id]/share-actions", () => actions);
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
  actions.prepareShare.mockResolvedValue({ status: "ok", token: TOKEN });
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

test("the cap shows its message and uploads nothing", async () => {
  actions.prepareShare.mockResolvedValue({ status: "limited", message: "You can have up to 100 shared links." });
  const sheet = await open();
  await userEvent.click(within(sheet).getByRole("button", { name: /create link/i }));
  expect(await within(sheet).findByText(/up to 100 shared links/i)).toBeInTheDocument();
  expect(upload).not.toHaveBeenCalled();
});

test("an existing live link shows its expiry and can be stopped", async () => {
  actions.getShareState.mockResolvedValue({ token: TOKEN, readyAt: "2026-09-26T10:00:00.000Z" });
  actions.stopSharing.mockResolvedValue({ status: "stopped" });
  const sheet = await open();
  expect(await within(sheet).findByText(/expires 26 oct/i)).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole("button", { name: /stop sharing/i }));
  await waitFor(() => expect(within(sheet).queryByTestId("share-url")).not.toBeInTheDocument());
  expect(actions.stopSharing).toHaveBeenCalledWith(TOKEN);
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
