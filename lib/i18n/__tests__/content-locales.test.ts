import { LOCALES, SHIPPED_LOCALES } from "../locales";
import { CONTENT_LOCALES } from "./content-locales";

it("no locale is routed before its content is complete", () => {
  for (const locale of SHIPPED_LOCALES) expect(CONTENT_LOCALES as readonly string[], locale).toContain(locale);
});

it("Plan 3 is complete: every locale has content", () => expect([...CONTENT_LOCALES].sort()).toEqual([...LOCALES].sort()));
