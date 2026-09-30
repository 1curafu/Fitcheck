import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import enUS from "@/messages/en-US.json";
import de from "@/messages/de.json";
import { renderInLocale } from "@/lib/i18n/__tests__/render";
import { SignInFailedNotice } from "../sign-in-failed-notice";

test("a failed sign-in explains itself once and strips ?error from the address", () => {
  window.history.pushState({}, "", "/sign-in?error=auth");
  const replaceState = vi.spyOn(window.history, "replaceState");
  render(<SignInFailedNotice />);
  expect(screen.getByRole("alert")).toHaveTextContent(enUS.auth.signInFailed);
  expect(replaceState).toHaveBeenCalledWith({}, "", "/sign-in");
  replaceState.mockRestore();
});

test("it is translated", async () => {
  await renderInLocale(<SignInFailedNotice />, "de");
  expect(screen.getByRole("alert")).toHaveTextContent(de.auth.signInFailed);
});
