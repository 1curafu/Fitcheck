import { expect, test } from "vitest";
import { redactShareUrl } from "../redact";

test("share tokens never reach analytics or error reports", () => {
  expect(redactShareUrl("https://fitcheck.space/l/AAAAAAAAAAAAAAAAAAAAAA?x=1")).toBe("https://fitcheck.space/l/[token]?x=1");
  expect(redactShareUrl("/l/AAAAAAAAAAAAAAAAAAAAAA")).toBe("/l/[token]");
  expect(redactShareUrl("https://fitcheck.space/closet")).toBe("https://fitcheck.space/closet");
});
