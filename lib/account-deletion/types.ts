export type DeletionStage = "storage" | "ledger" | "auth";

export type DeletionDependencies = {
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

  constructor(stage: DeletionStage) {
    super("Account deletion could not be completed");
    this.name = "DeletionFailure";
    this.stage = stage;
  }
}
