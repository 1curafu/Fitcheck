import {
  currentEntitlements,
  regeneratesUsedToday,
  recordGeneration,
  checkGeneration,
  type GenerationKind,
} from "@/lib/billing/entitlements";
import { QuotaExceededError } from "@/lib/billing/errors";

// Re-exported so the generator's call sites keep importing their gate and its
// error from one place. The class itself lives in `lib/billing/errors`, which
// carries no `server-only` — tests and any future client-side display of the
// remaining allowance must be able to reference it.
export { QuotaExceededError } from "@/lib/billing/errors";

/**
 * What the GATE needs to know.
 *
 * `occasion` is optional because only a regenerate is counted, and only per
 * occasion. A styled look is a flat capability check, and the styled action
 * resolves its occasion only after this gate — deliberately, so a free user is
 * turned away before paying for a forecast fetch.
 */
export type GenerationCheckRequest = {
  kind: GenerationKind;
  /** Required for `regenerate`; the allowance is per occasion. */
  occasion?: string;
  /** The user's LOCAL date — never the server's. */
  today: string;
};

/** What the LEDGER needs. `generation_events.occasion` is NOT NULL. */
export type GenerationRequest = GenerationCheckRequest & { occasion: string };

/**
 * The single gate every real generation passes through.
 *
 * It was written as a deliberate no-op so that adding a paid tier later would be
 * a change to THIS file rather than surgery across the generate action. This is
 * that change: the decision now lives in `lib/billing`, and this stays the one
 * call site the generator knows about.
 *
 * The three kinds are metered differently (docs/MONETISATION.md §2):
 *   drop       — always free, on every tier. The daily drop is never rationed.
 *   regenerate — free gets one per occasion per day.
 *   styled     — Pro only.
 */
export async function assertCanGenerate(
  _userId: string,
  req: GenerationCheckRequest,
): Promise<void> {
  const e = await currentEntitlements();

  // Only a regenerate needs the counter, and it is per-occasion — so drops and
  // styled looks skip the query entirely rather than paying for an answer that
  // cannot change the outcome.
  const regeneratesUsed =
    req.kind === "regenerate" && req.occasion
      ? await regeneratesUsedToday(req.occasion, req.today)
      : 0;

  const check = checkGeneration(e, { kind: req.kind, regeneratesUsed });
  if (!check.allowed) throw new QuotaExceededError(check.reason);
}

/**
 * Record a generation that actually happened.
 *
 * Deliberately separate from the check, and called only AFTER the model request
 * succeeds: a failed generation costs the user nothing, so charging for one
 * would be charging for our own error.
 */
export async function noteGeneration(userId: string, req: GenerationRequest): Promise<void> {
  await recordGeneration(userId, req.occasion, req.today, req.kind);
}
