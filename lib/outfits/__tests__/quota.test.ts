// Imported from the PURE module, not from `../quota` — quota.ts pulls in the
// entitlements resolver, which is behind `server-only` and does not resolve
// under jsdom. That guard is the point of the seam and is never dropped to make
// a test pass; the error class moved instead.
import { QuotaExceededError, UploadLimitError } from "@/lib/billing/errors";

// The screen renders this message verbatim, so it must be the reason the seam
// produced — not a generic fallback that says nothing about what happened.
test("QuotaExceededError carries a message a screen can render", () => {
  const e = new QuotaExceededError("You've used today's redo for this occasion. Pro regenerates freely.");
  expect(e.message).toMatch(/pro/i);
  expect(e.name).toBe("QuotaExceededError");
});

test("it is catchable as an Error and distinguishable by name", () => {
  const e = new QuotaExceededError("nope");
  expect(e).toBeInstanceOf(Error);
  expect(e.name).toBe("QuotaExceededError");
});

// Every call site catches this specific class; a default keeps an accidental
// bare `throw new QuotaExceededError()` from rendering an empty string.
test("it has a sensible default message", () => {
  expect(new QuotaExceededError().message.length).toBeGreaterThan(0);
});

// The upload gate is a different limit with a different upgrade story, so the
// two must not be caught interchangeably.
test("the upload limit is its own type, distinguishable from the generation one", () => {
  const upload = new UploadLimitError("ten today");
  expect(upload.name).toBe("UploadLimitError");
  expect(upload).toBeInstanceOf(Error);
  expect(upload).not.toBeInstanceOf(QuotaExceededError);
  expect(new UploadLimitError().message.length).toBeGreaterThan(0);
});
