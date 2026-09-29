/**
 * A legal document as data, not markup.
 *
 * Sections rather than JSX so a test can read them — `legal.test.ts` holds the
 * privacy policy to every third party the code actually sends data to — and so
 * a translation is a second object, not a second page.
 */
export type LegalSection = { id: string; heading: string; paragraphs: string[]; bullets?: string[] };
export type LegalDocument = {
  title: string;
  /** ISO date. Shown, and bumped on any change of substance. */
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const OPERATOR = {
  name: "Mykhailo Khimich",
  email: "legal@fitcheck.space",
  country: "Switzerland",
  // Owner-approved for publication 2026-09-24: Stripe wants the seller's address shown before payment.
  address: "Rapperswilerstrasse 1, 8733 Eschenbach SG, Switzerland",
} as const;

/** One date per document; every translation shows the English document's date. */
export const PRIVACY_UPDATED = "2026-09-28";
export const TERMS_UPDATED = "2026-09-26";
