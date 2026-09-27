import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { isShippedLocale } from "./locales";
import { messagesFor } from "./messages";

export default getRequestConfig(async () => {
  const locale = await rootParams.locale();
  if (!isShippedLocale(locale)) notFound();
  return { locale, messages: await messagesFor(locale) };
});
