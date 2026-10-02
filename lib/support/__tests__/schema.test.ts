import { describe, expect, it } from "vitest";
import { SupportMessageSchema } from "../schema";
import { validInput } from "./fixtures";

describe("support submission authority", () => {
  it.each([
    null, [], "text", { ...validInput, to: "victim@example.com" },
    { ...validInput, from: "victim@example.com" }, { ...validInput, userId: "other" },
    { ...validInput, extra: true }, { ...validInput, replyEmail: "reader@example.com\r\n" },
    { ...validInput, replyEmail: "reader@example.com\nBcc: victim@example.com" },
    { ...validInput, replyEmail: "reader@example.com\u0000" },
    { ...validInput, replyEmail: "reader@example.com\u007f" },
    { ...validInput, replyEmail: "invalid" }, { ...validInput, topic: "custom subject" },
    { ...validInput, submissionId: "not-a-uuid" },
    { ...validInput, message: " ".repeat(20) }, { ...validInput, message: "x".repeat(9) },
    { ...validInput, message: "x".repeat(4001) },
    { ...validInput, challengeToken: "" }, { ...validInput, challengeToken: "   " },
    { ...validInput, challengeToken: "x".repeat(2049) },
  ])("rejects invalid input %#", input => {
    expect(SupportMessageSchema.safeParse(input).success).toBe(false);
  });

  it.each(["account", "billing", "technical", "feedback", "other"])("accepts the fixed topic %s", topic => {
    expect(SupportMessageSchema.safeParse({ ...validInput, topic }).success).toBe(true);
  });

  it.each([10, 4000])("accepts %i trimmed message characters", length => {
    const parsed = SupportMessageSchema.parse({ ...validInput, message: `  ${"x".repeat(length)}  ` });
    expect(parsed.message).toHaveLength(length);
  });

  it("bounds valid email addresses rather than only their local part", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(email).toHaveLength(254);
    expect(SupportMessageSchema.safeParse({ ...validInput, replyEmail: email }).success).toBe(true);
    expect(SupportMessageSchema.safeParse({ ...validInput, replyEmail: `${email}d` }).success).toBe(false);
  });

  it("normalizes fields once while retaining message lines and token bytes", () => {
    const parsed = SupportMessageSchema.parse({ ...validInput, replyEmail: " reader@example.com ", message: " line one\nline two ", challengeToken: " token " });
    expect(parsed.replyEmail).toBe("reader@example.com");
    expect(parsed.message).toBe("line one\nline two");
    expect(parsed.challengeToken).toBe(" token ");
  });
});
