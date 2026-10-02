"use server";
import { getTranslations } from "next-intl/server";
import { getActionLocale } from "@/lib/i18n/action-locale";
import { readSupportRuntime } from "@/lib/support/config";
import { SupportMessageSchema, type SupportField, type SupportResult } from "@/lib/support/schema";
import { buildSupportEmail } from "@/lib/support/email";
import { verifySupportChallenge } from "@/lib/support/turnstile";
import { sendSupportEmail } from "@/lib/support/send";
import { reportSupportFailure } from "@/lib/support/telemetry";

/** Public by design: people who cannot sign in still need support. No account authority is granted. */
export async function sendSupportMessage(input: unknown): Promise<SupportResult> {
  const locale = await getActionLocale();
  const t = await getTranslations({ locale, namespace: "support" });
  const runtime = readSupportRuntime();
  if (runtime.mode === "off") return { status: "unavailable", message: t("results.unavailable") };
  const parsed = SupportMessageSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<SupportField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "replyEmail" || field === "topic" || field === "message") fieldErrors[field] = t(`validation.${field}`);
    }
    return { status: "invalid", message: t("validation.general"), fieldErrors };
  }
  let stage: "verify" | "send" = "verify";
  const report = (info: Parameters<typeof reportSupportFailure>[0]) => {
    try { reportSupportFailure(info); } catch { /* Best-effort diagnostics. */ }
  };
  try {
    const verification = await verifySupportChallenge(parsed.data.challengeToken, runtime);
    if (verification.status !== "verified") {
      report({ stage, outcome: verification.status === "rejected" ? "rejected" : verification.reason,
        ...(verification.status === "failed" && verification.httpClass ? { httpClass: verification.httpClass } : {}) });
      return { status: "verification-failed", message: t("results.verificationFailed") };
    }
    stage = "send";
    const delivery = await sendSupportEmail(buildSupportEmail(parsed.data), parsed.data.submissionId, runtime);
    if (delivery.status === "accepted") return { status: "sent", message: t("results.sent") };
    report({ stage, outcome: delivery.reason, ...(delivery.httpClass ? { httpClass: delivery.httpClass } : {}) });
    return { status: "failed", message: t("results.failed") };
  } catch {
    report({ stage, outcome: "unexpected" });
    return { status: "failed", message: t("results.failed") };
  }
}
