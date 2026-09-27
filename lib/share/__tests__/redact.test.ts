import { expect, test } from "vitest";
import { redactShareData, redactShareUrl } from "../redact";

test("share tokens never reach analytics or error reports", () => {
  expect(redactShareUrl("https://fitcheck.space/l/AAAAAAAAAAAAAAAAAAAAAA?x=1")).toBe("https://fitcheck.space/l/[token]?x=1");
  expect(redactShareUrl("/l/AAAAAAAAAAAAAAAAAAAAAA")).toBe("/l/[token]");
  expect(redactShareUrl("https://example.supabase.co/storage/v1/object/public/shares/AAAAAAAAAAAAAAAAAAAAAA/post.jpg"))
    .toBe("https://example.supabase.co/storage/v1/object/public/shares/[token]/post.jpg");
  expect(redactShareUrl("https://fitcheck.space/closet")).toBe("https://fitcheck.space/closet");
});

test("redaction returns a scrubbed copy and never edits the app's own objects", () => {
  const page = "https://fitcheck.space/l/AAAAAAAAAAAAAAAAAAAAAA";
  const args = ["copied", page];
  const state = { link: { url: page } };
  const crumb = { category: "console", data: { arguments: args, state } };
  const out = redactShareData(crumb);
  expect(JSON.stringify(out)).not.toContain("AAAAAAAAAAAAAAAAAAAAAA");
  expect(args[1]).toBe(page);
  expect(state.link.url).toBe(page);
});
