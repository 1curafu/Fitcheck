import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareDna } from "../share-dna";

vi.mock("@/lib/share/render", () => ({ loadFonts: vi.fn(async () => ({ serif: "serif", sans: "sans" })) }));
vi.mock("@/lib/style-dna/render", () => ({ renderDnaCard: vi.fn(async () => new Blob(["x"], { type: "image/jpeg" })) }));

const input = { kicker: "Style DNA", label: "Your archetype", archetype: "Preppy", blurb: "b", swatches: [], stats: [], footer: "f" };

test("the image is rendered before the tap, then handed to the native share sheet", async () => {
  const share = vi.fn(async () => {});
  Object.assign(navigator, { share, canShare: () => true });
  render(<ShareDna input={input} fileName="fitcheck-style-dna.jpg" />);
  // "Preparing…" until the Story is drawn, then "Share".
  await waitFor(() => expect(screen.getByRole("button", { name: "Share" })).toBeEnabled());
  await userEvent.click(screen.getByRole("button", { name: "Share" }));
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
});
