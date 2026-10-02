import { Activity, StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/script", () => ({ default: (props: { onReady: () => void; onError: () => void; src: string }) => <><button onClick={props.onReady}>Load challenge</button><button onClick={props.onError}>Fail script</button><span data-testid="script-url">{props.src}</span></> }));
import { SupportTurnstile } from "../turnstile";

type Options = { callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void };
const options: Options[] = [];
const remove = vi.fn();
const renderWidget = vi.fn((_node: HTMLElement, settings: Options) => { options.push(settings); return `widget-${options.length}`; });
function setup() {
  options.length = 0; vi.clearAllMocks();
  Object.assign(window, { turnstile: { render: renderWidget, remove } });
  return { siteKey: "public-key", refreshKey: 0, onToken: vi.fn(), onUnavailable: vi.fn() };
}
afterEach(() => { cleanup(); delete (window as Window & { turnstile?: unknown }).turnstile; vi.useRealTimers(); });

it("renders explicitly with fixed authority and invalidates expiry", () => {
  const props = setup(); const view = render(<SupportTurnstile {...props} />);
  fireEvent.click(screen.getByText("Load challenge"));
  expect(screen.getByTestId("script-url")).toHaveTextContent("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  expect(renderWidget.mock.calls[0][1]).toMatchObject({ sitekey: "public-key", action: "support", theme: "dark", size: "flexible", language: "en", "response-field": false });
  act(() => options[0].callback("token")); expect(props.onToken).toHaveBeenLastCalledWith("token");
  view.rerender(<SupportTurnstile {...props} />); expect(renderWidget).toHaveBeenCalledTimes(1);
  act(() => options[0]["expired-callback"]()); expect(props.onToken).toHaveBeenLastCalledWith(null);
  expect(screen.getByRole("group", { name: "Spam protection" })).toBeInTheDocument();
});
it("removes hidden widgets and ignores callbacks from old instances", () => {
  const props = setup(); const view = render(<Activity mode="visible"><SupportTurnstile {...props} /></Activity>);
  fireEvent.click(screen.getByText("Load challenge")); const old = options[0].callback;
  view.rerender(<Activity mode="hidden"><SupportTurnstile {...props} /></Activity>);
  expect(remove).toHaveBeenCalledWith("widget-1");
  act(() => old("late")); expect(props.onToken).not.toHaveBeenCalledWith("late");
  view.rerender(<Activity mode="visible"><SupportTurnstile {...props} /></Activity>);
  expect(renderWidget).toHaveBeenCalledTimes(2);
  act(() => options[1].callback("new")); expect(props.onToken).toHaveBeenLastCalledWith("new");
});
it("refreshes with a new instance and ignores stale solved tokens", () => {
  const props = setup(); const view = render(<SupportTurnstile {...props} />); fireEvent.click(screen.getByText("Load challenge"));
  const old = options[0].callback; view.rerender(<SupportTurnstile {...props} refreshKey={1} />);
  expect(remove).toHaveBeenCalledWith("widget-1"); act(() => old("late")); expect(props.onToken).not.toHaveBeenCalledWith("late");
  act(() => options[1]["error-callback"]()); expect(props.onUnavailable).toHaveBeenCalled(); expect(props.onToken).toHaveBeenLastCalledWith(null);
});
it("reports blocked scripts once without issuing tokens", () => {
  vi.useFakeTimers();
  const props = setup(); render(<SupportTurnstile {...props} />); fireEvent.click(screen.getByText("Fail script"));
  act(() => vi.advanceTimersByTime(10000));
  expect(props.onUnavailable).toHaveBeenCalledTimes(1); expect(renderWidget).not.toHaveBeenCalled();
});
it("bounds script startup, not a loaded person's challenge", () => {
  vi.useFakeTimers(); const props = setup(); render(<SupportTurnstile {...props} />);
  act(() => vi.advanceTimersByTime(10000)); expect(props.onUnavailable).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Load challenge")); props.onUnavailable.mockClear();
  act(() => vi.advanceTimersByTime(30000)); expect(props.onUnavailable).not.toHaveBeenCalled();
});
it("reports a missing API", () => {
  const props = setup(); delete (window as Window & { turnstile?: unknown }).turnstile;
  render(<SupportTurnstile {...props} />); fireEvent.click(screen.getByText("Load challenge"));
  expect(props.onUnavailable).toHaveBeenCalledTimes(1);
});
it("reports render failures safely", () => {
  const props = setup(); renderWidget.mockImplementationOnce(() => { throw new Error("provider internals"); });
  render(<SupportTurnstile {...props} />); fireEvent.click(screen.getByText("Load challenge"));
  expect(props.onUnavailable).toHaveBeenCalledTimes(1);
});
it("ignores callbacks after removal even if the provider throws", () => {
  const props = setup(); const view = render(<SupportTurnstile {...props} />);
  fireEvent.click(screen.getByText("Load challenge")); const old = options[0].callback;
  remove.mockImplementationOnce(() => { throw new Error("already removed"); });
  expect(() => view.unmount()).not.toThrow();
  act(() => old("late")); expect(props.onToken).not.toHaveBeenCalledWith("late");
});
it("uses fresh local tokens without a script and survives StrictMode", () => {
  const props = setup(); const view = render(<StrictMode><SupportTurnstile {...props} siteKey="fitcheck-support-test" /></StrictMode>);
  const first = props.onToken.mock.calls.filter(([value]) => value !== null).at(-1)?.[0];
  expect(first).toMatch(/^fitcheck-support-test:[0-9a-f-]{36}$/); expect(screen.queryByText("Load challenge")).not.toBeInTheDocument();
  view.rerender(<StrictMode><SupportTurnstile {...props} siteKey="fitcheck-support-test" refreshKey={1} /></StrictMode>);
  expect(props.onToken.mock.calls.filter(([value]) => value !== null).at(-1)?.[0]).not.toBe(first);
  expect(renderWidget).not.toHaveBeenCalled();
});
