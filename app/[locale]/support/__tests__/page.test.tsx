import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { messagesFor } from "@/lib/i18n/messages";
const form = vi.hoisted(() => vi.fn((props: Record<string, unknown>) => <div>{props.enabled ? "Form" : "Fallback"}</div>));
vi.mock("@/components/support/support-form", () => ({ SupportForm: form }));
vi.mock("@/lib/support/config", () => ({ getSupportPageConfig: () => ({ enabled: true, siteKey: "public-key" }) }));
vi.mock("../actions", () => ({ sendSupportMessage: vi.fn() }));
import SupportPage, { generateMetadata } from "../page";
import { sendSupportMessage } from "../actions";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("renders public chrome and passes only public config and the action", async () => {
  render(await SupportPage());
  expect(screen.getByRole("heading", { name: "Support", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to Fitcheck" })).toHaveAttribute("href", "/");
  expect(form.mock.calls[0][0]).toEqual({ enabled: true, siteKey: "public-key", onSendAction: sendSupportMessage });
});
it("keeps localized metadata crawlable, noindex and canonical", async () => {
  (globalThis as { __intl?: object }).__intl = { locale: "uk", messages: await messagesFor("uk") };
  const meta = await generateMetadata();
  expect(meta).toMatchObject({ robots: { index: false, follow: true }, alternates: { canonical: "https://fitcheck.space/uk/support", languages: { uk: "https://fitcheck.space/uk/support", "x-default": "https://fitcheck.space/support" } } });
  expect(Object.keys(meta.alternates?.languages ?? {})).toHaveLength(11);
});
