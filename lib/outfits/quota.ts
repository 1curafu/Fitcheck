/**
 * The single gate every real generation passes through.
 *
 * It allows everything today. It exists so that adding a paid tier later is a
 * change to THIS file — not surgery across the generate action — per the
 * project's preference for the extensible option over the minimal diff.
 * See docs/superpowers/plans/2026-07-22-regenerate-quota.md.
 */
export async function assertCanGenerate(_userId: string): Promise<void> {
  return;
}

export class QuotaExceededError extends Error {
  constructor() {
    super("Daily regeneration limit reached");
    this.name = "QuotaExceededError";
  }
}
