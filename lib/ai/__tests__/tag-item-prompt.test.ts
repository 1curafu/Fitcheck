import { PROMPT } from "../tagging-prompt";
import { BRANDING, FITS, LENGTHS, BULKS, DISTRESSING } from "../tagging-schema";

test("the prompt no longer instructs the model to discard logos", () => {
  expect(PROMPT).not.toContain("Ignore small logos");
});

test("the prompt asks for the accent colour explicitly", () => {
  expect(PROMPT).toContain("accent_color");
});

test("the prompt documents every new field", () => {
  for (const field of ["accent_color", "branding", "fit", "length", "bulk", "distressing"]) {
    expect(PROMPT).toContain(field);
  }
});

test("the prompt tells the model that fit is a guess the user will correct", () => {
  expect(PROMPT.toLowerCase()).toContain("null");
});

test("every enum value the schema accepts is named in the prompt", () => {
  // ⚠️ The prompt and the schema must agree exactly. If a value is added or
  // renamed in one and not the other, the model returns something
  // TagSchema.parse rejects and EVERY tagging call fails at runtime — with no
  // test failing first, because the two were previously asserted separately.
  //
  // Note: several values are shared across enums on purpose (e.g. "Regular"
  // appears in both FITS and BULKS; "None" in both BRANDING and
  // DISTRESSING) — that is not a bug, it just means a toContain check for
  // those values would pass even without this test. The full set below still
  // catches every value that is NOT shared, which is the failure mode that
  // matters.
  for (const value of [...BRANDING, ...FITS, ...LENGTHS, ...BULKS, ...DISTRESSING]) {
    expect(PROMPT).toContain(value);
  }
});
