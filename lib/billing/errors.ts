/**
 * Billing's error types, kept PURE and free of `server-only`.
 *
 * Same split as `tiers.ts` versus `entitlements.ts`: anything that touches
 * Supabase sits behind the `server-only` guard, and anything a test — or a
 * future client component rendering "1 redo left" — needs to reference lives
 * out here. Importing these must never drag the resolver into a client bundle.
 *
 * Both are STATES the UI explains, not failures. Every call site catches them
 * and returns a `limited` result rather than letting them surface as
 * "something went wrong".
 */

export class QuotaExceededError extends Error {
  constructor(message = "Daily generation limit reached") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class UploadLimitError extends Error {
  constructor(message = "Daily upload limit reached") {
    super(message);
    this.name = "UploadLimitError";
  }
}
