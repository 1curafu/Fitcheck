import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertStorageStatsMatch,
  createManifest,
  validateManifestRestoreAge,
  validateManifest,
} from "../manifest.mjs";

const SQL_FILES = {
  "roles.sql": "roles\n",
  "schema.sql": "schema\n",
  "data.sql": "data\n",
  "migration-history-schema.sql": "history schema\n",
  "migration-history-data.sql": "history data\n",
};

let root: string;

async function createStage(withObjects = true) {
  await mkdir(join(root, "database"), { recursive: true });
  await mkdir(join(root, "storage", "wardrobe", "user-1", "item-1"), {
    recursive: true,
  });
  await Promise.all(
    Object.entries(SQL_FILES).map(([name, contents]) =>
      writeFile(join(root, "database", name), contents),
    ),
  );
  if (withObjects) {
    await writeFile(
      join(root, "storage", "wardrobe", "user-1", "item-1", "original.jpg"),
      "abc",
    );
    await writeFile(
      join(root, "storage", "wardrobe", "user-1", "item-1", "cutout.webp"),
      "12345",
    );
  }
}

async function writeValidManifest(storageStats = { objectCount: 2, totalBytes: 8 }) {
  return createManifest({
    root,
    projectRef: "fitcheck-prod-ref",
    storageStats,
    toolVersions: {
      node: "22.20.0",
      supabase: "2.109.1",
      restic: "0.19.1",
      rclone: "1.75.1",
      postgres: "18.3",
    },
    metadata: { gitSha: "abc123", workflowRunId: "42" },
    createdAt: new Date("2026-09-18T02:45:00.000Z"),
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "fitcheck-backup-manifest-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("backup manifest", () => {
  test("records independently derived SQL hashes and source Storage totals", async () => {
    await createStage();

    const manifest = await writeValidManifest();

    expect(manifest).toMatchObject({
      formatVersion: 1,
      createdAt: "2026-09-18T02:45:00.000Z",
      projectRef: "fitcheck-prod-ref",
      metadata: { gitSha: "abc123", workflowRunId: "42" },
      storage: { bucket: "wardrobe", objectCount: 2, totalBytes: 8 },
      database: {
        "roles.sql": {
          bytes: 6,
          sha256: "0f8ffbd6cd643eb1b595ee683fc34eef9d208436d1ecbf35585077d17151e2d7",
        },
        "schema.sql": {
          bytes: 7,
          sha256: "d58182dccdba686e7f5f4555b86758a9a1957e9e4337137f6553897f6519d5b9",
        },
        "data.sql": {
          bytes: 5,
          sha256: "6667b2d1aab6a00caa5aee5af8ad9f1465e567abf1c209d15727d57b3e8f6e5f",
        },
      },
    });
    expect(JSON.parse(await readFile(join(root, "manifest.json"), "utf8"))).toEqual(
      manifest,
    );
    await expect(validateManifest(root)).resolves.toEqual(manifest);
  });

  test("rejects an SQL dump changed after the manifest was created", async () => {
    await createStage();
    await writeValidManifest();
    await writeFile(join(root, "database", "data.sql"), "evil\n");

    await expect(validateManifest(root)).rejects.toThrow("data.sql checksum");
  });

  test("rejects a missing required SQL dump", async () => {
    await createStage();
    await unlink(join(root, "database", "roles.sql"));

    await expect(writeValidManifest()).rejects.toThrow("roles.sql");
  });

  test("rejects an unsupported manifest format", async () => {
    await createStage();
    const manifest = await writeValidManifest();
    await writeFile(
      join(root, "manifest.json"),
      `${JSON.stringify({ ...manifest, formatVersion: 99 }, null, 2)}\n`,
    );

    await expect(validateManifest(root)).rejects.toThrow("format version 99");
  });

  test("rejects a local Storage copy whose count or bytes differ from the source", async () => {
    await createStage();
    await writeValidManifest();
    await writeFile(
      join(root, "storage", "wardrobe", "user-1", "item-1", "thumb.webp"),
      "extra",
    );

    await expect(validateManifest(root)).rejects.toThrow(
      "Storage copy does not match source",
    );
  });

  test("accepts an empty wardrobe only when both source totals are zero", async () => {
    await createStage(false);
    const manifest = await writeValidManifest({ objectCount: 0, totalBytes: 0 });

    await expect(validateManifest(root)).resolves.toEqual(manifest);
  });

  test("rejects restored Storage totals that differ from the snapshot manifest", async () => {
    expect(() =>
      assertStorageStatsMatch(
        { objectCount: 12, totalBytes: 4096 },
        { objectCount: 11, totalBytes: 4096 },
        "restored Storage",
      ),
    ).toThrow("restored Storage does not match source");
  });

  test.each([
    [undefined, "createdAt"],
    ["not-a-timestamp", "createdAt"],
    ["2026-09-20T00:00:00.001Z", "future"],
    ["2026-08-20T00:00:00.000Z", "older than 30 days"],
  ])("rejects a restore manifest with createdAt %j", async (createdAt, message) => {
    await createStage();
    const manifest = await writeValidManifest();
    await writeFile(
      join(root, "manifest.json"),
      `${JSON.stringify({ ...manifest, ...(createdAt === undefined ? { createdAt: undefined } : { createdAt }) }, null, 2)}\n`,
    );

    await expect(
      validateManifestRestoreAge(root, new Date("2026-09-20T00:00:00.000Z")),
    ).rejects.toThrow(message);
  });

  test("accepts a manifest created exactly 30 days before the restore clock", async () => {
    await createStage();
    await writeValidManifest();

    await expect(
      validateManifestRestoreAge(root, new Date("2026-10-18T02:45:00.000Z")),
    ).resolves.toMatchObject({ createdAt: "2026-09-18T02:45:00.000Z" });
  });
});
