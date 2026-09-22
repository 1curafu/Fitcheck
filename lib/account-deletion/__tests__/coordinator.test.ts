import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { adminClient, createDeletionAdminClient, hardDeleteAuthUser, purgeWardrobePrefix, writeProductionDeletionTombstone } = vi.hoisted(
  () => ({
    adminClient: { storage: { from: vi.fn() }, auth: { admin: { deleteUser: vi.fn() } } },
    createDeletionAdminClient: vi.fn(),
    hardDeleteAuthUser: vi.fn(),
    purgeWardrobePrefix: vi.fn(),
    writeProductionDeletionTombstone: vi.fn(),
  }),
);

vi.mock("../admin", () => ({ createDeletionAdminClient, hardDeleteAuthUser }));
vi.mock("../b2-writer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../b2-writer")>()),
  writeProductionDeletionTombstone,
}));
vi.mock("../storage.mjs", () => ({ purgeWardrobePrefix }));

import { runAccountDeletion } from "../coordinator";
import { DeletionFailure } from "../types";
import { deleteLiveAccount } from "../runtime";

const USER_ID = "715ed5db-f090-4b8c-a067-640ecee36aa0";
const NOW = new Date("2026-09-19T08:09:10.000Z");

describe("runAccountDeletion", () => {
  test("deletes storage, writes the ledger, deletes Auth, then purges residual storage", async () => {
    const calls: string[] = [];

    await runAccountDeletion(
      { userId: USER_ID, requestedAt: NOW },
      {
        purgeStorage: async () => void calls.push("storage"),
        writeTombstone: async () => void calls.push("ledger"),
        deleteAuthUser: async () => void calls.push("auth"),
      },
    );

    expect(calls).toEqual(["storage", "ledger", "auth", "storage"]);
  });

  test("reports a residual Storage failure only after Auth is already deleted", async () => {
    const calls: string[] = [];
    const providerMessage = `storage provider rejected ${USER_ID} person@example.com`;
    let purges = 0;

    const deletion = runAccountDeletion(
      { userId: USER_ID, requestedAt: NOW },
      {
        purgeStorage: async () => {
          calls.push("storage");
          purges += 1;
          if (purges === 2) throw new Error(providerMessage);
        },
        writeTombstone: async () => void calls.push("ledger"),
        deleteAuthUser: async () => void calls.push("auth"),
      },
    );

    await expect(deletion).rejects.toMatchObject({ name: "DeletionFailure", stage: "residual-storage" });
    expect(calls).toEqual(["storage", "ledger", "auth", "storage"]);
    await deletion.catch((error) => {
      expect((error as Error).message).not.toContain(providerMessage);
      expect((error as Error).message).not.toContain(USER_ID);
    });
  });

  test("stops after a Storage failure without exposing provider details", async () => {
    const calls: string[] = [];
    const providerMessage = `storage provider rejected ${USER_ID} person@example.com`;

    await expect(
      runAccountDeletion(
        { userId: USER_ID, requestedAt: NOW },
        {
          purgeStorage: async () => {
            calls.push("storage");
            throw new Error(providerMessage);
          },
          writeTombstone: async () => void calls.push("ledger"),
          deleteAuthUser: async () => void calls.push("auth"),
        },
      ),
    ).rejects.toMatchObject({
      name: "DeletionFailure",
      stage: "storage",
      message: "Account deletion could not be completed",
    });

    expect(calls).toEqual(["storage"]);

    try {
      await runAccountDeletion(
        { userId: USER_ID, requestedAt: NOW },
        {
          purgeStorage: async () => {
            throw new Error(providerMessage);
          },
          writeTombstone: async () => undefined,
          deleteAuthUser: async () => undefined,
        },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(DeletionFailure);
      expect(error).toHaveProperty("stage", "storage");
      expect((error as Error).message).not.toContain(providerMessage);
      expect((error as Error).message).not.toContain(USER_ID);
      expect((error as Error).message).not.toContain("person@example.com");
    }
  });

  test("stops after a ledger failure before deleting Auth", async () => {
    const calls: string[] = [];
    const providerMessage = `B2 upload rejected ${USER_ID} person@example.com at deletion-ledger/v1/private.json`;

    const deletion = runAccountDeletion(
      { userId: USER_ID, requestedAt: NOW },
      {
        purgeStorage: async () => void calls.push("storage"),
        writeTombstone: async () => {
          calls.push("ledger");
          throw new Error(providerMessage);
        },
        deleteAuthUser: async () => void calls.push("auth"),
      },
    );

    await expect(deletion).rejects.toMatchObject({ stage: "ledger" });

    expect(calls).toEqual(["storage", "ledger"]);
    await deletion.catch((error) => {
      expect(error).toBeInstanceOf(DeletionFailure);
      expect(error).toHaveProperty("stage", "ledger");
      expect((error as Error).message).not.toContain(providerMessage);
      expect((error as Error).message).not.toContain(USER_ID);
      expect((error as Error).message).not.toContain("person@example.com");
      expect((error as Error).message).not.toContain("B2 upload");
      expect((error as Error).message).not.toContain("deletion-ledger/v1/private.json");
    });
  });

  test("stops after an Auth failure", async () => {
    const calls: string[] = [];
    const providerMessage = `Supabase Auth refused ${USER_ID} person@example.com at /auth/v1/admin/users`;

    const deletion = runAccountDeletion(
      { userId: USER_ID, requestedAt: NOW },
      {
        purgeStorage: async () => void calls.push("storage"),
        writeTombstone: async () => void calls.push("ledger"),
        deleteAuthUser: async () => {
          calls.push("auth");
          throw new Error(providerMessage);
        },
      },
    );

    await expect(deletion).rejects.toMatchObject({ stage: "auth" });

    expect(calls).toEqual(["storage", "ledger", "auth"]);
    await deletion.catch((error) => {
      expect(error).toBeInstanceOf(DeletionFailure);
      expect(error).toHaveProperty("stage", "auth");
      expect((error as Error).message).not.toContain(providerMessage);
      expect((error as Error).message).not.toContain(USER_ID);
      expect((error as Error).message).not.toContain("person@example.com");
      expect((error as Error).message).not.toContain("Supabase Auth");
      expect((error as Error).message).not.toContain("/auth/v1/admin/users");
    });
  });

  test("runs the same successful dependencies twice for a retry", async () => {
    const calls: string[] = [];
    const dependencies = {
      purgeStorage: async () => void calls.push("storage"),
      writeTombstone: async () => void calls.push("ledger"),
      deleteAuthUser: async () => void calls.push("auth"),
    };

    await runAccountDeletion({ userId: USER_ID, requestedAt: NOW }, dependencies);
    await runAccountDeletion({ userId: USER_ID, requestedAt: NOW }, dependencies);

    expect(calls).toEqual(["storage", "ledger", "auth", "storage", "storage", "ledger", "auth", "storage"]);
  });
});

describe("deleteLiveAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createDeletionAdminClient.mockReturnValue(adminClient);
  });

  afterEach(() => vi.unstubAllEnvs());

  test.each(["", "   "])("does not start a destructive stage when B2 configuration %j is invalid", async (keyId) => {
    vi.stubEnv("B2_DELETION_KEY_ID", keyId);
    vi.stubEnv("B2_DELETION_APPLICATION_KEY", "production-application-key");
    vi.stubEnv("DELETION_LEDGER_HMAC_KEY", "production-hmac-key");

    await expect(deleteLiveAccount(USER_ID, NOW)).rejects.toThrow("B2 deletion ledger configuration is required");

    expect(purgeWardrobePrefix).not.toHaveBeenCalled();
    expect(writeProductionDeletionTombstone).not.toHaveBeenCalled();
    expect(hardDeleteAuthUser).not.toHaveBeenCalled();
  });
});
