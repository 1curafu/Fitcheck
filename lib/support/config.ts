import "server-only";
import { STUB_SITE_KEY, SUPPORT_HOSTNAME } from "./contact";

export type SupportRuntime =
  | { mode: "off" }
  | { mode: "stub"; siteKey: typeof STUB_SITE_KEY; hostname: typeof SUPPORT_HOSTNAME }
  | { mode: "live"; siteKey: string; hostname: typeof SUPPORT_HOSTNAME; resendKey: string; turnstileSecret: string };
export type EnabledSupportRuntime = Exclude<SupportRuntime, { mode: "off" }>;

export function readSupportRuntime(env: NodeJS.ProcessEnv = process.env): SupportRuntime {
  const onVercel = Boolean(env.VERCEL || env.VERCEL_ENV);
  if (env.FITCHECK_STUB_SUPPORT === "1") {
    return onVercel ? { mode: "off" } : { mode: "stub", siteKey: STUB_SITE_KEY, hostname: SUPPORT_HOSTNAME };
  }
  if (onVercel && env.VERCEL_ENV !== "production") return { mode: "off" };
  const resendKey = env.SUPPORT_RESEND_API_KEY?.trim();
  const turnstileSecret = env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (env.SUPPORT_ENABLED !== "1" || !resendKey || !turnstileSecret || !siteKey) return { mode: "off" };
  return { mode: "live", resendKey, turnstileSecret, siteKey, hostname: SUPPORT_HOSTNAME };
}

export function getSupportPageConfig(runtime: SupportRuntime = readSupportRuntime()) {
  return runtime.mode === "off" ? { enabled: false, siteKey: null } : { enabled: true, siteKey: runtime.siteKey };
}
