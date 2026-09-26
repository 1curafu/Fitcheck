import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaptureFlow } from "../capture-flow";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  onSaved: null as null | ((mode: "single" | "batch", preview: { image: Blob; name: string }) => void),
  batch: null as null | {
    total: number; currentIndex: number | null; currentStage: null; nextReady: boolean;
    capacityMessage: null; stopped: boolean;
    summary: { total: number; saved: number; skipped: number; unprocessed: number };
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("../use-capture", () => ({
  useCapture: (options: { onSaved: (mode: "single" | "batch", preview: { image: Blob; name: string }) => void }) => {
    state.onSaved = options.onSaved;
    return { phase: "aim", draft: null, error: null, saving: false, batch: state.batch,
      capture: vi.fn(), captureMany: vi.fn(), retry: vi.fn(), skip: vi.fn(), finish: vi.fn() };
  },
}));

beforeEach(() => { state.push.mockClear(); state.batch = null; });

test("intermediate batch saves stay on upload while a single save navigates", () => {
  const createUrl = vi.fn().mockReturnValue("blob:first");
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = vi.fn();
  state.batch = { total: 3, currentIndex: 1, currentStage: null, nextReady: true,
    capacityMessage: null, stopped: false,
    summary: { total: 3, saved: 1, skipped: 0, unprocessed: 2 } };
  const { container } = render(<CaptureFlow />);
  act(() => state.onSaved?.("batch", { image: new Blob(["first"]), name: "First shirt" }));
  expect(state.push).not.toHaveBeenCalled();
  expect(screen.getByRole("img", { name: "First shirt" })).toHaveAttribute("src", "blob:first");
  expect(container.querySelectorAll("[data-filled]")).toHaveLength(3);
  act(() => state.onSaved?.("single", { image: new Blob(["single"]), name: "Single shirt" }));
  expect(state.push).toHaveBeenCalledWith("/closet");
});

test("batch summary enters the closet once", async () => {
  state.batch = { total: 3, currentIndex: null, currentStage: null, nextReady: false,
    capacityMessage: null, stopped: true,
    summary: { total: 3, saved: 2, skipped: 1, unprocessed: 0 } };
  render(<CaptureFlow />);
  await userEvent.click(screen.getByRole("button", { name: "Enter closet" }));
  expect(state.push).toHaveBeenCalledExactlyOnceWith("/closet");
});

test("starting another closet batch clears previews from the previous batch", async () => {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:previous");
  const revokeUrl = vi.fn();
  URL.revokeObjectURL = revokeUrl;
  state.batch = { total: 2, currentIndex: 1, currentStage: null, nextReady: false,
    capacityMessage: null, stopped: false,
    summary: { total: 2, saved: 1, skipped: 0, unprocessed: 1 } };
  const { rerender } = render(<CaptureFlow />);
  act(() => state.onSaved?.("batch", { image: new Blob(["saved"]), name: "Previous batch shirt" }));
  expect(screen.getByRole("img", { name: "Previous batch shirt" })).toBeInTheDocument();

  state.batch = null;
  rerender(<CaptureFlow />);
  await userEvent.upload(screen.getByLabelText("Choose several photos"),
    new File(["next"], "next.jpg", { type: "image/jpeg" }));
  expect(revokeUrl).toHaveBeenCalledWith("blob:previous");
  state.batch = { total: 1, currentIndex: 0, currentStage: null, nextReady: false,
    capacityMessage: null, stopped: false,
    summary: { total: 1, saved: 0, skipped: 0, unprocessed: 1 } };
  rerender(<CaptureFlow />);
  expect(screen.queryByRole("img", { name: "Previous batch shirt" })).not.toBeInTheDocument();
});
