#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const FORMAT_VERSION = 1;
const REQUIRED_SQL_FILES = [
  "roles.sql",
  "schema.sql",
  "data.sql",
  "migration-history-schema.sql",
  "migration-history-data.sql",
];

async function checksumFile(path, label) {
  let contents;
  try {
    contents = await readFile(path);
  } catch (error) {
    throw new Error(`${label} is missing`, { cause: error });
  }
  if (contents.length === 0) throw new Error(`${label} is empty`);

  return {
    bytes: contents.length,
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
}

async function directoryStats(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Storage directory is missing: ${path}`, { cause: error });
  }

  let objectCount = 0;
  let totalBytes = 0;
  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      const nested = await directoryStats(entryPath);
      objectCount += nested.objectCount;
      totalBytes += nested.totalBytes;
    } else if (entry.isFile()) {
      const details = await stat(entryPath);
      objectCount += 1;
      totalBytes += details.size;
    } else {
      throw new Error(`Storage copy contains an unsupported entry: ${entryPath}`);
    }
  }
  return { objectCount, totalBytes };
}

function validateStorageStats(storageStats) {
  if (
    !storageStats ||
    !Number.isSafeInteger(storageStats.objectCount) ||
    storageStats.objectCount < 0 ||
    !Number.isSafeInteger(storageStats.totalBytes) ||
    storageStats.totalBytes < 0
  ) {
    throw new Error("Storage stats must contain non-negative integer objectCount and totalBytes");
  }
}

export async function createManifest({
  root,
  projectRef,
  storageStats,
  toolVersions,
  metadata = {},
  createdAt = new Date(),
}) {
  if (typeof projectRef !== "string" || projectRef.length === 0) {
    throw new Error("projectRef is required");
  }
  validateStorageStats(storageStats);
  if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime())) {
    throw new Error("createdAt must be a valid Date");
  }

  const stageRoot = resolve(root);
  const database = {};
  for (const name of REQUIRED_SQL_FILES) {
    database[name] = await checksumFile(join(stageRoot, "database", name), name);
  }

  const manifest = {
    formatVersion: FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    projectRef,
    metadata,
    toolVersions,
    database,
    storage: {
      bucket: "wardrobe",
      ...storageStats,
    },
  };

  const manifestPath = join(stageRoot, "manifest.json");
  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, manifestPath);
  return manifest;
}

export async function validateManifest(root) {
  const stageRoot = resolve(root);
  const manifestPath = join(stageRoot, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error("manifest.json is missing or invalid", { cause: error });
  }

  if (manifest.formatVersion !== FORMAT_VERSION) {
    throw new Error(`Unsupported manifest format version ${manifest.formatVersion}`);
  }
  validateStorageStats(manifest.storage);

  for (const name of REQUIRED_SQL_FILES) {
    const expected = manifest.database?.[name];
    if (!expected) throw new Error(`manifest is missing ${name}`);
    const actual = await checksumFile(join(stageRoot, "database", name), name);
    if (actual.sha256 !== expected.sha256) {
      throw new Error(`${name} checksum does not match manifest`);
    }
    if (actual.bytes !== expected.bytes) {
      throw new Error(`${name} size does not match manifest`);
    }
  }

  const actualStorage = await directoryStats(join(stageRoot, "storage", "wardrobe"));
  if (
    actualStorage.objectCount !== manifest.storage.objectCount ||
    actualStorage.totalBytes !== manifest.storage.totalBytes
  ) {
    throw new Error(
      "Storage copy does not match source " +
        `(expected ${manifest.storage.objectCount} objects/${manifest.storage.totalBytes} bytes, ` +
        `found ${actualStorage.objectCount} objects/${actualStorage.totalBytes} bytes)`,
    );
  }

  return manifest;
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = new Map();
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${flag ?? "end of command"}`);
    }
    flags.set(flag.slice(2), value);
  }
  return { command, flags };
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`${label} is missing or invalid`, { cause: error });
  }
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  const root = flags.get("root");
  if (!root) throw new Error("--root is required");

  if (command === "validate") {
    const manifest = await validateManifest(root);
    process.stdout.write(`${JSON.stringify(manifest)}\n`);
    return;
  }
  if (command !== "create") throw new Error("command must be create or validate");

  const projectRef = flags.get("project-ref");
  const storageStatsPath = flags.get("storage-stats");
  const toolVersionsPath = flags.get("tool-versions");
  if (!projectRef || !storageStatsPath || !toolVersionsPath) {
    throw new Error(
      "create requires --project-ref, --storage-stats and --tool-versions",
    );
  }

  const rcloneStats = await readJson(storageStatsPath, "Storage stats");
  const toolVersions = await readJson(toolVersionsPath, "tool versions");
  const manifest = await createManifest({
    root,
    projectRef,
    storageStats: {
      objectCount: rcloneStats.count,
      totalBytes: rcloneStats.bytes,
    },
    toolVersions,
    metadata: {
      gitSha: process.env.GITHUB_SHA ?? null,
      workflowRunId: process.env.GITHUB_RUN_ID ?? null,
    },
  });
  process.stdout.write(`${JSON.stringify(manifest)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
