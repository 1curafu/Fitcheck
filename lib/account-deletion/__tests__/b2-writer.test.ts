import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { listB2TombstoneDigests, writeB2Tombstone } from "../ledger.mjs";

vi.mock("server-only", () => ({}));

const bucket = { id: "bucket-123", name: "fitcheck-prod-backups-eu-a7k29m" };
const userId = "715ed5db-f090-4b8c-a067-640ecee36aa0";
const requestedAt = new Date("2026-09-19T08:09:10.000Z");
const hmacKey = "test-only-hmac-key-with-enough-entropy";
const credentials = { keyId: "writer-id", applicationKey: "writer-secret" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorization(capabilities: string[] = ["writeFiles"], options: Partial<{ buckets: unknown; namePrefix: unknown }> = {}) {
  return {
    authorizationToken: "account-token",
    apiInfo: {
      storageApi: {
        apiUrl: "https://api.example.test",
        allowed: {
          buckets: options.buckets ?? [bucket],
          capabilities,
          namePrefix: Object.hasOwn(options, "namePrefix") ? options.namePrefix : "deletion-ledger/",
        },
      },
    },
  };
}

function writerConfig() {
  return { ...credentials, userId, requestedAt, hmacKey };
}

function expectedTombstone(key = hmacKey) {
  const digest = createHmac("sha256", key).update(userId, "utf8").digest("hex");
  const fileName = `deletion-ledger/v1/2026-09-19/${digest}.json`;
  const body = JSON.stringify({ version: 1, requestedAt: requestedAt.toISOString() });
  return { fileName, body, sha1: createHash("sha1").update(body, "utf8").digest("hex") };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("writeB2Tombstone", () => {
  test("uploads an opaque, content-addressed deletion tombstone through a narrowed writer key", async () => {
    const expected = expectedTombstone();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(json(authorization()))
      .mockResolvedValueOnce(json({ bucketId: bucket.id, uploadUrl: "https://upload.example.test", authorizationToken: "upload-token" }))
      .mockResolvedValueOnce(json({ fileName: expected.fileName, bucketId: bucket.id, contentSha1: expected.sha1 }));

    await expect(writeB2Tombstone(writerConfig())).resolves.toEqual({ fileName: expected.fileName });

    const [, authorizeInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const authorizeHeaders = authorizeInit.headers as Record<string, string>;
    expect(authorizeHeaders.Authorization).toBe(
      `Basic ${Buffer.from("writer-id:writer-secret").toString("base64")}`,
    );

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(uploadUrl).toBe("https://upload.example.test");
    const uploadHeaders = uploadInit.headers as Record<string, string>;
    const uploadBody = String(uploadInit.body);
    expect(uploadHeaders["X-Bz-File-Name"]).toContain("deletion-ledger%2Fv1%2F");
    expect(uploadHeaders["X-Bz-Content-Sha1"]).toMatch(/^[a-f0-9]{40}$/);
    expect(Number(uploadHeaders["Content-Length"])).toBe(Buffer.byteLength(uploadBody));
    expect(uploadBody).not.toContain(userId);
    expect(uploadBody).toBe(expected.body);
  });

  test.each([
    ["zero buckets", { buckets: [] }],
    ["two buckets", { buckets: [bucket, { id: "second", name: bucket.name }] }],
    ["a different bucket", { buckets: [{ id: bucket.id, name: "other-bucket" }] }],
    ["a null prefix", { namePrefix: null }],
    ["a broader prefix", { namePrefix: "" }],
    ["a different prefix", { namePrefix: "other/" }],
  ])("fails closed before an upload for %s", async (_case, restriction) => {
    const fetchMock = vi.fn().mockResolvedValue(json(authorization(["writeFiles"], restriction)));
    vi.stubGlobal("fetch", fetchMock);

    await expect(writeB2Tombstone(writerConfig())).rejects.toThrow("B2 authorization failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test.each([[["listFiles"]], [["writeFiles", "listFiles"]], [[]]])(
    "requires exactly writeFiles, not %j",
    async (capabilities) => {
      const fetchMock = vi.fn().mockResolvedValue(json(authorization(capabilities)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(writeB2Tombstone(writerConfig())).rejects.toThrow("B2 authorization failed");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  test.each([
    ["authorization", [json({ message: "secret provider detail" }, 401)], "B2 authorization failed"],
    ["upload URL", [json(authorization()), json({ message: "secret provider detail" }, 401)], "B2 upload URL failed"],
    [
      "upload",
      [
        json(authorization()),
        json({ bucketId: bucket.id, uploadUrl: "https://upload.example.test", authorizationToken: "upload-token" }),
        json({ message: "secret provider detail" }, 400),
      ],
      "B2 upload failed",
    ],
  ])("replaces provider details when %s responds unsuccessfully", async (_stage, responses, message) => {
    const fetchMock = vi.fn();
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(writeB2Tombstone(writerConfig())).rejects.toThrowError(new Error(message));
  });

  test.each([
    ["authorization", [json({})], "B2 authorization failed"],
    ["upload URL", [json(authorization()), json({})], "B2 upload URL failed"],
    [
      "upload",
      [
        json(authorization()),
        json({ bucketId: bucket.id, uploadUrl: "https://upload.example.test", authorizationToken: "upload-token" }),
        json({}),
      ],
      "B2 upload failed",
    ],
  ])("rejects a malformed %s response with a fixed error", async (_stage, responses, message) => {
    const fetchMock = vi.fn();
    for (const response of responses) fetchMock.mockResolvedValueOnce(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(writeB2Tombstone(writerConfig())).rejects.toThrowError(new Error(message));
  });

  test.each([
    ["fileName", "different-name.json"],
    ["bucketId", "other-bucket"],
    ["contentSha1", "0".repeat(40)],
  ])("rejects an upload response with a mismatched %s", async (field, different) => {
    const expected = expectedTombstone();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(json(authorization()))
      .mockResolvedValueOnce(json({ bucketId: bucket.id, uploadUrl: "https://upload.example.test", authorizationToken: "upload-token" }))
      .mockResolvedValueOnce(json({ fileName: expected.fileName, bucketId: bucket.id, contentSha1: expected.sha1, [field]: different }));

    await expect(writeB2Tombstone(writerConfig())).rejects.toThrow("B2 upload failed");
  });
});

describe("listB2TombstoneDigests", () => {
  test("uses the exact restricted prefix across pages and returns only v1 tombstone digests", async () => {
    const digestA = "a".repeat(64);
    const digestB = "b".repeat(64);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(json(authorization(["listFiles"])))
      .mockResolvedValueOnce(
        json({
          files: [
            { fileName: `deletion-ledger/v1/2026-09-19/${digestA}.json` },
            { fileName: "deletion-ledger/v2/2026-09-19/" + "c".repeat(64) + ".json" },
            { fileName: "deletion-ledger/v1/not-a-date/" + "d".repeat(64) + ".json" },
          ],
          nextFileName: "deletion-ledger/v1/next",
        }),
      )
      .mockResolvedValueOnce(json({ files: [{ fileName: `deletion-ledger/v1/2026-09-20/${digestB}.json` }], nextFileName: null }));

    await expect(listB2TombstoneDigests(credentials)).resolves.toEqual(new Set([digestA, digestB]));

    const first = new URL(fetchMock.mock.calls[1]![0] as string);
    const second = new URL(fetchMock.mock.calls[2]![0] as string);
    expect(first.pathname).toBe("/b2api/v4/b2_list_file_names");
    expect(first.searchParams.get("bucketId")).toBe(bucket.id);
    expect(first.searchParams.get("prefix")).toBe("deletion-ledger/");
    expect(first.searchParams.get("maxFileCount")).toBe("10000");
    expect(first.searchParams.has("startFileName")).toBe(false);
    expect(second.searchParams.get("startFileName")).toBe("deletion-ledger/v1/next");
  });

  test.each([[["writeFiles"]], [["listFiles", "writeFiles"]], [[]]])(
    "requires exactly listFiles, not %j",
    async (capabilities) => {
      const fetchMock = vi.fn().mockResolvedValue(json(authorization(capabilities)));
      vi.stubGlobal("fetch", fetchMock);

      await expect(listB2TombstoneDigests(credentials)).rejects.toThrow("B2 authorization failed");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});

describe("writeProductionDeletionTombstone", () => {
  test("uses the three server-only production variables to write the tombstone", async () => {
    vi.stubEnv("B2_DELETION_KEY_ID", "production-key-id");
    vi.stubEnv("B2_DELETION_APPLICATION_KEY", "production-secret");
    vi.stubEnv("DELETION_LEDGER_HMAC_KEY", "production-hmac-key");
    const expected = expectedTombstone("production-hmac-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(json(authorization()))
      .mockResolvedValueOnce(json({ bucketId: bucket.id, uploadUrl: "https://upload.example.test", authorizationToken: "upload-token" }))
      .mockResolvedValueOnce(json({ fileName: expected.fileName, bucketId: bucket.id, contentSha1: expected.sha1 }));
    const { writeProductionDeletionTombstone } = await import("../b2-writer");

    await expect(writeProductionDeletionTombstone(userId, requestedAt)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("production-key-id:production-secret").toString("base64")}`,
    );
  });

  test("fails closed when production configuration is missing", async () => {
    vi.stubEnv("B2_DELETION_KEY_ID", "");
    vi.stubEnv("B2_DELETION_APPLICATION_KEY", "");
    vi.stubEnv("DELETION_LEDGER_HMAC_KEY", "");
    const { writeProductionDeletionTombstone } = await import("../b2-writer");

    await expect(writeProductionDeletionTombstone(userId, requestedAt)).rejects.toThrow(
      "B2 deletion ledger configuration is required",
    );
  });

  test.each(["localhost", "127.0.0.1"])("permits the no-I/O deletion-ledger stub against local Supabase at %s", async (hostname) => {
    vi.stubEnv("FITCHECK_STUB_DELETION_LEDGER", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `http://${hostname}:54321`);
    const { writeProductionDeletionTombstone } = await import("../b2-writer");

    await expect(writeProductionDeletionTombstone(userId, requestedAt)).resolves.toBeUndefined();
  });

  test("refuses the no-I/O deletion-ledger stub against hosted Supabase", async () => {
    vi.stubEnv("FITCHECK_STUB_DELETION_LEDGER", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    const { writeProductionDeletionTombstone } = await import("../b2-writer");

    await expect(writeProductionDeletionTombstone(userId, requestedAt)).rejects.toThrow(
      "Deletion ledger stub requires local Supabase",
    );
  });
});
