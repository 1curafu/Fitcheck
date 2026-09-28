import { outputLanguage } from "../output-locale";
import { LOCALES } from "@/lib/i18n/locales";

test("every product locale has an explicit AI output language", () => {
  expect(LOCALES.map(outputLanguage)).toEqual([
    "American English", "British English", "Ukrainian", "Russian", "German", "French",
    "Italian", "European Portuguese", "Spanish", "Dutch",
  ]);
});
