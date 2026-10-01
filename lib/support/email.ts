import { SUPPORT_EMAIL, SUPPORT_FROM, SUPPORT_SUBJECTS } from "./contact";
import type { SupportMessage } from "./schema";

export type SupportEmail = { from: string; to: string[]; reply_to: string; subject: string; text: string };

/** Runtime-independent payload: a fresh challenge must not change an unchanged retry. */
export function buildSupportEmail(input: SupportMessage): SupportEmail {
  const topic = SUPPORT_SUBJECTS[input.topic];
  return {
    from: SUPPORT_FROM,
    to: [SUPPORT_EMAIL],
    reply_to: input.replyEmail,
    subject: `[Fitcheck support] ${topic}`,
    text: [
      `Submission: ${input.submissionId}`, `Topic: ${topic}`, `Reply email: ${input.replyEmail}`,
      "The reply address was supplied by the sender; account identity is not verified.", "", input.message,
    ].join("\n"),
  };
}
