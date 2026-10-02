import { expect, it } from "vitest";
import { buildSupportEmail } from "../email";
import { validInput } from "./fixtures";

// Support sends from its own Resend account and subdomain, so a spammed form cannot use up the sign-in mail allowance.
it("sends only to the team with the supplied address as Reply-To", () => {
  expect(buildSupportEmail(validInput)).toEqual({
    from: "Fitcheck Support <noreply@support.fitcheck.space>", to: ["support@fitcheck.space"],
    reply_to: "reader@example.com", subject: "[Fitcheck support] Technical issue",
    text: "Submission: 123e4567-e89b-42d3-a456-426614174000\nTopic: Technical issue\nReply email: reader@example.com\nThe reply address was supplied by the sender; account identity is not verified.\n\nThe sign-in link does not open.",
  });
});

it("keeps unchanged retry payloads identical after a new challenge", () => {
  expect(buildSupportEmail(validInput)).toEqual(buildSupportEmail({ ...validInput, challengeToken: "new-token" }));
  expect(JSON.stringify(buildSupportEmail(validInput))).not.toContain("fresh-challenge");
});

it("keeps Unicode and HTML-looking user content literal in plain text", () => {
  const email = buildSupportEmail({ ...validInput, message: "Привіт <img src=x>\nHelp please" });
  expect(email.text).toContain("Привіт <img src=x>\nHelp please");
  expect(email).not.toHaveProperty("html");
});

it.each([
  ["account", "Account"], ["billing", "Billing"], ["technical", "Technical issue"],
  ["feedback", "Feedback"], ["other", "Other"],
] as const)("builds a fixed subject for %s", (topic, label) => {
  expect(buildSupportEmail({ ...validInput, topic }).subject).toBe(`[Fitcheck support] ${label}`);
});
