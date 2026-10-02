import { Activity } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SupportForm } from "../support-form";
import type { SupportMessage, SupportResult } from "@/lib/support/schema";
import { validInput } from "@/lib/support/__tests__/fixtures";
import { renderInLocale } from "@/lib/i18n/__tests__/render";
import { SHIPPED_LOCALES } from "@/lib/i18n/locales";
import { messagesFor } from "@/lib/i18n/messages";

vi.mock("next/script", () => ({ default: (props: { onReady: () => void; onError: () => void }) => <><button type="button" onClick={props.onReady}>Load challenge</button><button type="button" onClick={props.onError}>Fail script</button></> }));
afterEach(() => { cleanup(); delete (window as Window & { turnstile?: unknown }).turnstile; });
const failure: SupportResult = { status: "failed", message: "Sending uncertain" };
const sent: SupportResult = { status: "sent", message: "Message sent" };
function fill() {
  fireEvent.change(screen.getByLabelText("Reply email"), { target: { value: validInput.replyEmail } });
  fireEvent.change(screen.getByLabelText("Topic"), { target: { value: validInput.topic } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: validInput.message } });
}
const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Send message" }).closest("form")!);
function mount(onSendAction = vi.fn().mockResolvedValue(sent)) {
  return { onSendAction, view: render(<SupportForm enabled siteKey="fitcheck-support-test" onSendAction={onSendAction} />) };
}
function deferred() {
  let resolve!: (value: SupportResult) => void;
  const promise = new Promise<SupportResult>(accept => { resolve = accept; });
  return { promise, resolve };
}
it("keeps an unchanged draft and id on retry but gets a fresh challenge", async () => {
  const action = vi.fn().mockResolvedValueOnce(failure).mockResolvedValue(sent); mount(action); fill(); submit();
  expect(await screen.findByRole("status")).toHaveTextContent("Sending uncertain");
  expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
  await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled()); submit();
  await screen.findByText("Message sent");
  const first = action.mock.calls[0][0] as SupportMessage, second = action.mock.calls[1][0] as SupportMessage;
  expect(second.submissionId).toBe(first.submissionId); expect(second.challengeToken).not.toBe(first.challengeToken);
  expect(Object.keys(first).sort()).toEqual(["challengeToken", "message", "replyEmail", "submissionId", "topic"]);
  expect(screen.getAllByRole("status")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Write another message" }));
  expect(screen.getByLabelText("Message")).toHaveValue(""); expect(screen.getByLabelText("Reply email")).toHaveValue("");
});
it("invalidates the id after an edit even if the text is restored", async () => {
  const action = vi.fn().mockResolvedValue(failure); mount(action); fill(); submit(); await screen.findByRole("status");
  await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Different message" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: validInput.message } }); submit();
  await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  expect(action.mock.calls[1][0].submissionId).not.toBe(action.mock.calls[0][0].submissionId);
});
it("blocks duplicate submissions and disables fields while pending", async () => {
  const pending = deferred(); const action = vi.fn().mockReturnValue(pending.promise); mount(action); fill(); submit();
  fireEvent.submit(screen.getByRole("button", { name: "Sending…" }).closest("form")!);
  expect(action).toHaveBeenCalledTimes(1);
  for (const label of ["Reply email", "Topic", "Message"]) expect(screen.getByLabelText(label)).toBeDisabled();
  await act(async () => pending.resolve(failure)); expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
});
it.each(["verification-failed", "unavailable", "failed"] as const)("preserves the draft for %s", async status => {
  mount(vi.fn().mockResolvedValue({ status, message: "Generic outcome" })); fill(); submit();
  expect(await screen.findByRole("status")).toHaveTextContent("Generic outcome");
  expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
  await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
});
it("preserves the draft if the action throws and hides exception details", async () => {
  mount(vi.fn().mockRejectedValue(new Error("private detail"))); fill(); submit();
  expect(await screen.findByRole("status")).toHaveTextContent("couldn't confirm");
  expect(screen.queryByText("private detail")).not.toBeInTheDocument(); expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
});
it("focuses the first invalid field and associates its error", async () => {
  mount(vi.fn().mockResolvedValue({ status: "invalid", message: "Check fields", fieldErrors: { replyEmail: "Email invalid", message: "Message invalid" } }));
  fill(); submit(); await screen.findByText("Email invalid");
  await waitFor(() => expect(screen.getByLabelText("Reply email")).toHaveFocus()); expect(screen.getByLabelText("Reply email")).toHaveAccessibleDescription("Email invalid");
});
it.each([false, true])("shows an email fallback when configuration is incomplete (%s)", enabled => {
  render(<SupportForm enabled={enabled} siteKey={null} onSendAction={vi.fn()} />);
  expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Email us instead" })).toHaveAttribute("href", "mailto:support@fitcheck.space");
  expect(screen.getByRole("link", { name: /Privacy Policy/ })).toHaveAttribute("href", "/privacy");
});
it("does not send without a solved challenge", () => {
  const action = vi.fn(); render(<SupportForm enabled siteKey="live-key" onSendAction={action} />); fill(); submit();
  expect(action).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
});
it("ignores late success across Activity and retains the unchanged retry id", async () => {
  const pending = deferred(); const action = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(failure);
  const props = { enabled: true, siteKey: "fitcheck-support-test", onSendAction: action };
  const view = render(<Activity mode="visible"><SupportForm {...props} /></Activity>); fill(); submit();
  view.rerender(<Activity mode="hidden"><SupportForm {...props} /></Activity>);
  await act(async () => pending.resolve(sent));
  view.rerender(<Activity mode="visible"><SupportForm {...props} /></Activity>);
  expect(screen.queryByText("Message sent")).not.toBeInTheDocument(); expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
  submit(); await screen.findByRole("status");
  expect(action.mock.calls[1][0].submissionId).toBe(action.mock.calls[0][0].submissionId);
});
it("keeps markup as input text without storing the draft", () => {
  const store = vi.spyOn(window.localStorage, "setItem"); mount();
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "<script>private text</script>" } });
  expect([...document.querySelectorAll("script")].map(node => node.textContent).join(" ")).not.toContain("private text"); expect(store).not.toHaveBeenCalled(); store.mockRestore();
});
it.each(SHIPPED_LOCALES)("labels the form and topics in %s", async locale => {
  const messages = await messagesFor(locale);
  await renderInLocale(<SupportForm enabled siteKey="fitcheck-support-test" onSendAction={vi.fn()} />, locale);
  expect(screen.getByLabelText(messages.support.replyEmail)).toBeInTheDocument();
  for (const topic of Object.values(messages.support.topics)) expect(screen.getByRole("option", { name: topic })).toBeInTheDocument();
});

it("clears expired challenges and recreates verification on explicit retry", () => {
  type Options = { callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void };
  const captured: Options[] = [];
  Object.assign(window, { turnstile: { render: (_node: HTMLElement, options: Options) => { captured.push(options); return "widget"; }, remove: vi.fn() } });
  const action = vi.fn(); render(<SupportForm enabled siteKey="live-key" onSendAction={action} />); fill();
  fireEvent.click(screen.getByText("Load challenge")); act(() => captured[0].callback("solved"));
  expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  act(() => captured[0]["expired-callback"]()); submit(); expect(action).not.toHaveBeenCalled();
  act(() => captured[0]["error-callback"]());
  expect(screen.getAllByRole("status")).toHaveLength(1);
  expect(screen.getByRole("status")).toHaveTextContent("couldn't verify");
  fireEvent.click(screen.getByRole("button", { name: "Try verification again" }));
  expect(captured).toHaveLength(2); act(() => captured[0].callback("stale"));
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  act(() => captured[1].callback("fresh")); expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  expect(screen.getByLabelText("Message")).toHaveValue(validInput.message);
});

it("guards two submits within the same browser event batch", async () => {
  const pending = deferred(); const action = vi.fn().mockReturnValue(pending.promise); mount(action); fill();
  const form = screen.getByRole("button", { name: "Send message" }).closest("form")!;
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(action).toHaveBeenCalledTimes(1); await act(async () => pending.resolve(failure));
});
