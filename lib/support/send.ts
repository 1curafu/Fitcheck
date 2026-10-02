import "server-only";
import type { EnabledSupportRuntime } from "./config";
import type { SupportEmail } from "./email";
import type { ProviderFailure } from "./schema";
import { requestSupportJson } from "./request";

export async function sendSupportEmail(
  email: SupportEmail,
  submissionId: string,
  runtime: EnabledSupportRuntime,
): Promise<{ status: "accepted"; emailId: string } | ProviderFailure> {
  const result = await requestSupportJson(signal => runtime.mode === "stub"
    ? Promise.resolve(Response.json({ id: `stub-support-${submissionId}` }))
    : fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal,
      headers: {
        Authorization: `Bearer ${runtime.resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `support/v1/${submissionId}`,
      },
      body: JSON.stringify(email),
    }), 8000);
  if (result.status === "failed") return result;
  const body = result.body;
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string"
    || !body.id.trim() || body.id.length > 256) return { status: "failed", reason: "malformed" };
  return { status: "accepted", emailId: body.id };
}
