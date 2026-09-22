import { describe, expect, test, vi } from "vitest";
import { deletionDigest } from "@/lib/account-deletion/ledger.mjs";
import { parseRetainedHmacKeys, reconcileDeletedAccounts } from "../reconcile-deletions.mjs";

const DELETED_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVE_ID = "22222222-2222-4222-8222-222222222222";
const HMAC_KEY = "test-only-hmac-key-with-enough-entropy";
const PREVIOUS_HMAC_KEY = "previous-test-only-hmac-key-with-enough-entropy";

const config = {
  supabaseUrl: "https://restore-ref.supabase.co",
  serviceRoleKey: "restore-service-role-key",
  readerKeyId: "reader-key-id",
  readerApplicationKey: "reader-application-key",
  hmacKey: HMAC_KEY,
};

describe("restore deletion reconciliation", () => {
  test("matches a tombstone created with a retained previous HMAC key", async () => {
    const purgeStorage = vi.fn();
    const deleteUser = vi.fn();

    await expect(
      reconcileDeletedAccounts(
        {
          ...config,
          previousHmacKeysJson: JSON.stringify([PREVIOUS_HMAC_KEY]),
        },
        {
          listDigests: async () => new Set([deletionDigest(DELETED_ID, PREVIOUS_HMAC_KEY)]),
          listUsers: async () => [DELETED_ID],
          listOwners: async () => [],
          purgeStorage,
          deleteUser,
          write: vi.fn(),
        },
      ),
    ).resolves.toEqual({ scanned: 1, deleted: 1, orphanPrefixes: 0 });

    expect(purgeStorage).toHaveBeenCalledWith(DELETED_ID);
    expect(deleteUser).toHaveBeenCalledWith(DELETED_ID);
  });

  test("keeps the current key first and removes duplicate retained keys", () => {
    expect(
      parseRetainedHmacKeys(HMAC_KEY, JSON.stringify([PREVIOUS_HMAC_KEY, HMAC_KEY, PREVIOUS_HMAC_KEY])),
    ).toEqual([HMAC_KEY, PREVIOUS_HMAC_KEY]);
  });

  test.each(["", "{}", "[\"\"]", "[\"  \"]", "[\"previous\", 1]"])(
    "rejects invalid previous HMAC key configuration before listing the ledger: %s",
    async (previousHmacKeysJson) => {
      const listDigests = vi.fn();

      await expect(
        reconcileDeletedAccounts(
          { ...config, previousHmacKeysJson },
          {
            listDigests,
            listUsers: async () => [DELETED_ID],
            listOwners: async () => [],
            purgeStorage: vi.fn(),
            deleteUser: vi.fn(),
            write: vi.fn(),
          },
        ),
      ).rejects.toThrow("Deletion reconciliation configuration is invalid");

      expect(listDigests).not.toHaveBeenCalled();
    },
  );

  test("purges and hard-deletes only restored users whose HMAC is in the ledger", async () => {
    const purgeStorage = vi.fn();
    const deleteUser = vi.fn();

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      listOwners: async () => [],
      purgeStorage,
      deleteUser,
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 2, deleted: 1, orphanPrefixes: 0 });
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
      listOwners: async () => [],
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
        listOwners: async () => [],
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
      listOwners: async () => [],
      purgeStorage: vi.fn(),
      deleteUser,
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 1001, deleted: 1, orphanPrefixes: 0 });
    expect(pages).toHaveBeenNthCalledWith(1, 1);
    expect(pages).toHaveBeenNthCalledWith(2, 2);
    expect(deleteUser).toHaveBeenCalledWith(DELETED_ID);
  });

  test("snapshots all restored Auth IDs before deletion can shift later offset pages", async () => {
    const users = Array.from({ length: 1001 }, (_, index) =>
      `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const tombstonedUserId = users[1000]!;
    const deletedUserId = users[0]!;
    const purgeStorage = vi.fn();
    const deleteUser = vi.fn(async (userId: string) => {
      users.splice(users.indexOf(userId), 1);
    });

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () =>
        new Set([deletionDigest(deletedUserId, HMAC_KEY), deletionDigest(tombstonedUserId, HMAC_KEY)]),
      listUsers: async (page) => users.slice((page - 1) * 1000, page * 1000),
      listOwners: async () => [],
      purgeStorage,
      deleteUser,
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 1001, deleted: 2, orphanPrefixes: 0 });
    expect(purgeStorage).toHaveBeenCalledWith(tombstonedUserId);
    expect(deleteUser).toHaveBeenCalledWith(tombstonedUserId);
    expect(users).not.toContain(tombstonedUserId);
  });

  test("treats a ledger with no restored matches as a successful zero-delete reconciliation", async () => {
    const write = vi.fn();

    await expect(
      reconcileDeletedAccounts(config, {
        listDigests: async () => new Set(),
        listUsers: async () => [ACTIVE_ID],
        listOwners: async () => [],
        purgeStorage: vi.fn(),
        deleteUser: vi.fn(),
        write,
      }),
    ).resolves.toEqual({ scanned: 1, deleted: 0, orphanPrefixes: 0 });

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith("Deletion reconciliation complete: scanned=1 deleted=0 orphanPrefixes=0\n");
  });

  test("emits aggregate counts only and never a restored user ID", async () => {
    const write = vi.fn();

    await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      listOwners: async () => [],
      purgeStorage: vi.fn(),
      deleteUser: vi.fn(),
      write,
    });

    const output = write.mock.calls.map(([line]) => line).join("");
    expect(output).toBe("Deletion reconciliation complete: scanned=2 deleted=1 orphanPrefixes=0\n");
    expect(output).not.toContain(DELETED_ID);
    expect(output).not.toContain(ACTIVE_ID);
  });
  test("purges owner folders with no restored Auth user and keeps live owners", async () => {
    const ORPHAN_ID = "33333333-3333-4333-8333-333333333333";
    const purgeStorage = vi.fn();
    const write = vi.fn();

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      listOwners: async () => [ACTIVE_ID, ORPHAN_ID],
      purgeStorage,
      deleteUser: vi.fn(),
      write,
    });

    expect(result).toEqual({ scanned: 2, deleted: 1, orphanPrefixes: 1 });
    expect(purgeStorage.mock.calls.map(([id]) => id)).toEqual([DELETED_ID, ORPHAN_ID]);
    expect(purgeStorage).not.toHaveBeenCalledWith(ACTIVE_ID);
    const output = write.mock.calls.map(([line]) => line).join("");
    expect(output).toBe("Deletion reconciliation complete: scanned=2 deleted=1 orphanPrefixes=1\n");
    expect(output).not.toContain(ORPHAN_ID);
  });

  test("lists owners only after tombstoned users are removed, so they are not counted as orphans", async () => {
    const order: string[] = [];

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID],
      listOwners: async () => {
        order.push("owners");
        return [];
      },
      purgeStorage: async () => void order.push("storage"),
      deleteUser: async () => void order.push("auth"),
      write: vi.fn(),
    });

    expect(order).toEqual(["storage", "auth", "owners"]);
    expect(result.orphanPrefixes).toBe(0);
  });

  test("treats a folder still present for a tombstoned user as an orphan, never as a live owner", async () => {
    const purgeStorage = vi.fn();

    const result = await reconcileDeletedAccounts(config, {
      listDigests: async () => new Set([deletionDigest(DELETED_ID, HMAC_KEY)]),
      listUsers: async () => [DELETED_ID, ACTIVE_ID],
      listOwners: async () => [DELETED_ID, ACTIVE_ID],
      purgeStorage,
      deleteUser: vi.fn(),
      write: vi.fn(),
    });

    expect(result).toEqual({ scanned: 2, deleted: 1, orphanPrefixes: 1 });
    expect(purgeStorage.mock.calls.map(([id]) => id)).toEqual([DELETED_ID, DELETED_ID]);
  });

  test("fails closed when the owner listing fails", async () => {
    const write = vi.fn();

    await expect(
      reconcileDeletedAccounts(config, {
        listDigests: async () => new Set(),
        listUsers: async () => [ACTIVE_ID],
        listOwners: async () => {
          throw new Error("Wardrobe listing failed");
        },
        purgeStorage: vi.fn(),
        deleteUser: vi.fn(),
        write,
      }),
    ).rejects.toThrow("Deletion reconciliation failed");
    expect(write).not.toHaveBeenCalled();
  });
});
