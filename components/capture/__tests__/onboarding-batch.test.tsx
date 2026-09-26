import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingCapture } from "../onboarding-capture";

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

test("each batch save advances onboarding and summary allows entry before five", async () => {
  state.push.mockClear();
  const createUrl = vi.fn().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
  const revokeUrl = vi.fn();
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
  const { rerender, container } = render(<OnboardingCapture initialCount={0} />);
  act(() => {
    state.onSaved?.("batch", { image: new Blob(["first"]), name: "First sweater" });
    state.onSaved?.("batch", { image: new Blob(["second"]), name: "Second sweater" });
  });
  expect(container.querySelectorAll('[data-filled="true"]')).toHaveLength(2);
  expect(screen.getByRole("img", { name: "First sweater" })).toHaveAttribute("src", "blob:first");
  expect(screen.getByRole("img", { name: "Second sweater" })).toHaveAttribute("src", "blob:second");
  state.batch = { total: 3, currentIndex: null, currentStage: null, nextReady: false,
    capacityMessage: null, stopped: true,
    summary: { total: 3, saved: 2, skipped: 1, unprocessed: 0 } };
  rerender(<OnboardingCapture initialCount={0} />);
  await userEvent.click(screen.getByRole("button", { name: "Enter closet" }));
  expect(state.push).toHaveBeenCalledWith("/closet");
  expect(createUrl).toHaveBeenCalledTimes(2);
  expect(revokeUrl).not.toHaveBeenCalled();
});
