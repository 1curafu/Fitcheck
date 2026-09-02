import { PROMPT } from "../tag-item";

test("the prompt no longer instructs the model to discard logos", () => {
  expect(PROMPT).not.toContain("Ignore small logos");
});

test("the prompt asks for the accent colour explicitly", () => {
  expect(PROMPT).toContain("accent_color");
});

test("the prompt documents every new field", () => {
  for (const field of ["accent_color", "branding", "fit", "length", "bulk"]) {
    expect(PROMPT).toContain(field);
  }
});

test("the prompt tells the model that fit is a guess the user will correct", () => {
  expect(PROMPT.toLowerCase()).toContain("null");
});
