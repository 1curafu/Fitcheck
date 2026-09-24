/**
 * `residual-storage` runs after the Auth delete, so a failure there means the account IS deleted; only an
 * upload that raced the earlier stages may remain, for the orphan sweep to collect.
 */
export type DeletionStage = "billing" | "storage" | "ledger" | "auth" | "residual-storage";

export type DeletionDependencies = {
  /** Cancels every subscription that could still charge. First, and fail-closed: no data goes while billing can. */
  cancelBilling(userId: string): Promise<void>;
  purgeStorage(userId: string): Promise<void>;
  writeTombstone(userId: string, requestedAt: Date): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
};

export type AccountDeletionInput = {
  userId: string;
  requestedAt: Date;
};

export class DeletionFailure extends Error {
  readonly stage: DeletionStage;
  /** One of the adapters' own fixed messages, or "unclassified" — never provider text or personal data. */
  readonly reason: string;

  constructor(stage: DeletionStage, reason = "unclassified") {
    super("Account deletion could not be completed");
    this.name = "DeletionFailure";
    this.stage = stage;
    this.reason = reason;
  }
}
