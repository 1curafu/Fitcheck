import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaptureFlow } from "../capture-flow";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  onSaved: null as null | ((mode: "single" | "batch") => void),
  batch: null as null | {
    total: number; currentIndex: number | null; currentStage: null; nextReady: boolean;
    capacityMessage: null; stopped: boolean;
    summary: { total: number; saved: number; skipped: number; unprocessed: number };
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("../use-capture", () => ({
  useCapture: (options: { onSaved: (mode: "single" | "batch") => void }) => {
    state.onSaved = options.onSaved;
    return { phase: "aim", draft: null, error: null, saving: false, batch: state.batch,
      capture: vi.fn(), captureMany: vi.fn(), retry: vi.fn(), skip: vi.fn(), finish: vi.fn() };
  },
}));

beforeEach(() => { state.push.mockClear(); state.batch = null; });

test("intermediate batch saves stay on upload while a single save navigates", () => {
  render(<CaptureFlow />);
  act(() => state.onSaved?.("batch"));
  expect(state.push).not.toHaveBeenCalled();
  act(() => state.onSaved?.("single"));
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
