import { describe, expect, test, vi } from "vitest";
import { deletionDigest } from "@/lib/account-deletion/ledger.mjs";
import { reconcileDeletedAccounts } from "../reconcile-deletions.mjs";

const DELETED_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVE_ID = "22222222-2222-4222-8222-222222222222";
const HMAC_KEY = "test-only-hmac-key-with-enough-entropy";

const config = {
  supabaseUrl: "https://restore-ref.supabase.co",
  serviceRoleKey: "restore-service-role-key",
  readerKeyId: "reader-key-id",
  readerApplicationKey: "reader-application-key",
  hmacKey: HMAC_KEY,
};

describe("restore deletion reconciliation", () => {
  test("purges and hard-deletes only restored users whose HMAC is in the ledger", async () => {
    const purgeStorage = vi.fn();
    const deleteUser = vi.fn();

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      purgeStorage,
      deleteUser,
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 2, deleted: 1 });
    expect(purgeStorage).toHaveBeenCalledWith(DELETED_ID);
    expect(deleteUser).toHaveBeenCalledWith(DELETED_ID);
    expect(purgeStorage).not.toHaveBeenCalledWith(ACTIVE_ID);
    expect(deleteUser).not.toHaveBeenCalledWith(ACTIVE_ID);
  });

  test("purges Storage before deleting the matching Auth user", async () => {
    const order: string[] = [];

    await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID],
      purgeStorage: async () => void order.push("storage"),
      deleteUser: async () => void order.push("auth"),
      write: vi.fn(),
    });

    expect(order).toEqual(["storage", "auth"]);
  });

  test("stops closed when Storage purge fails", async () => {
    const deleteUser = vi.fn();
    const write = vi.fn();

    await expect(
      reconcileDeletedAccounts(config, {
        listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
        listUsers: async () => [DELETED_ID],
        purgeStorage: async () => {
          throw new Error(`private ${DELETED_ID}`);
        },
        deleteUser,
        write,
      }),
    ).rejects.toThrow("Deletion reconciliation failed");

    expect(deleteUser).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  test("paginates through every restored Auth user", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const pages = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([DELETED_ID]);
    const deleteUser = vi.fn();

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: pages,
      purgeStorage: vi.fn(),
      deleteUser,
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 1001, deleted: 1 });
    expect(pages).toHaveBeenNthCalledWith(1, 1);
    expect(pages).toHaveBeenNthCalledWith(2, 2);
    expect(deleteUser).toHaveBeenCalledWith(DELETED_ID);
  });

  test("treats a ledger with no restored matches as a successful zero-delete reconciliation", async () => {
    const write = vi.fn();

    await expect(
      reconcileDeletedAccounts(config, {
        listDigests: async () => new Set(),
        listUsers: async () => [ACTIVE_ID],
        purgeStorage: vi.fn(),
        deleteUser: vi.fn(),
        write,
      }),
    ).resolves.toEqual({ scanned: 1, deleted: 0 });

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith("Deletion reconciliation complete: scanned=1 deleted=0\n");
  });

  test("emits aggregate counts only and never a restored user ID", async () => {
    const write = vi.fn();

    await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      purgeStorage: vi.fn(),
      deleteUser: vi.fn(),
      write,
    });

    const output = write.mock.calls.map(([line]) => line).join("");
    expect(output).toBe("Deletion reconciliation complete: scanned=2 deleted=1\n");
    expect(output).not.toContain(DELETED_ID);
    expect(output).not.toContain(ACTIVE_ID);
  });
});
