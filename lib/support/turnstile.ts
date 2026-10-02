import "server-only";
import type { EnabledSupportRuntime } from "./config";
import { STUB_SITE_KEY } from "./contact";
import { SupportMessageSchema, type ProviderFailure } from "./schema";
import { requestSupportJson } from "./request";

export async function verifySupportChallenge(
  token: string,
  runtime: EnabledSupportRuntime,
): Promise<{ status: "verified" } | { status: "rejected" } | ProviderFailure> {
  if (!token.trim() || token.length > 2048) return { status: "rejected" };
  const prefix = `${STUB_SITE_KEY}:`;
  if (runtime.mode === "live" && token.startsWith(prefix)) return { status: "rejected" };
  const result = await requestSupportJson(signal => {
    if (runtime.mode === "stub") {
      const valid = token.startsWith(prefix) && SupportMessageSchema.shape.submissionId.safeParse(token.slice(prefix.length)).success;
      return Promise.resolve(Response.json({ success: valid, action: "support", hostname: runtime.hostname }));
    }
    return fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: runtime.turnstileSecret, response: token }),
    });
  }, 5000);
  if (result.status === "failed") return result;
  const body = result.body;
  if (!body || typeof body !== "object" || !("success" in body) || body.success !== true
    || !("action" in body) || body.action !== "support"
    || !("hostname" in body) || body.hostname !== runtime.hostname) return { status: "rejected" };
  return { status: "verified" };
}
