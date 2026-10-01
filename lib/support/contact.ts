/** Public contact details and stable topic identifiers; safe in client bundles. */
export const SUPPORT_EMAIL = "support@fitcheck.space";
/** Support sends from its OWN Resend account on this subdomain: a spammed form must never use up the sign-in mail allowance. */
export const SUPPORT_FROM = "Fitcheck Support <noreply@support.fitcheck.space>";
export const SUPPORT_HOSTNAME = "fitcheck.space";
export const STUB_SITE_KEY = "fitcheck-support-test";
export const SUPPORT_TOPICS = ["account", "billing", "technical", "feedback", "other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];
export const SUPPORT_SUBJECTS: Record<SupportTopic, string> = {
  account: "Account", billing: "Billing", technical: "Technical issue", feedback: "Feedback", other: "Other",
};
