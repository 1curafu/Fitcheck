import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { ShippedLocale } from "../locales";
import { messagesFor } from "../messages";

/** Renders UI with the locale's real messages for the whole test. */
export async function renderInLocale(ui: ReactElement, locale: ShippedLocale) {
  (globalThis as { __intl?: object }).__intl = {
    locale,
    messages: await messagesFor(locale),
  };
  return render(ui);
}
