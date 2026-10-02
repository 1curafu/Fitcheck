import { z } from "zod";
import { SUPPORT_TOPICS } from "./contact";

const replyEmail = z.string()
  .refine(value => !/[\u0000-\u001f\u007f]/.test(value))
  .pipe(z.string().trim().max(254).email());

export const SupportMessageSchema = z.object({
  replyEmail,
  topic: z.enum(SUPPORT_TOPICS),
  message: z.string().trim().min(10).max(4000),
  submissionId: z.string().uuid(),
  challengeToken: z.string().min(1).max(2048).refine(value => value.trim().length > 0),
}).strict();
export type SupportMessage = z.output<typeof SupportMessageSchema>;
export type SupportField = "replyEmail" | "topic" | "message";
export type SupportResult =
  | { status: "sent"; message: string }
  | { status: "invalid"; message: string; fieldErrors: Partial<Record<SupportField, string>> }
  | { status: "verification-failed" | "unavailable" | "failed"; message: string };
export type ProviderFailure = {
  status: "failed";
  reason: "http" | "timeout" | "malformed" | "network";
  httpClass?: "4xx" | "5xx" | "other";
};
