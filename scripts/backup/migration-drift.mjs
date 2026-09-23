#!/usr/bin/env node

import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const MIGRATION_FILE = /^(\d{14})_[a-z0-9_]+\.sql$/;

/**
 * The migration versions the repository defines, from `<14 digits>_<name>.sql` file names. Any other file fails
 * loudly: a misnamed migration is exactly what would slip past a version comparison.
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function localMigrationVersions(dir) {
  const versions = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => {
      const match = name.match(MIGRATION_FILE);
      if (!match) throw new Error(`unexpected migration file name: ${name}`);
      return match[1];
    });
  if (new Set(versions).size !== versions.length) throw new Error("duplicate migration versions in the repository");
  return versions.sort();
}

/**
 * @param {string[]} local
 * @param {string[]} remote
 * @returns {{ pending: string[], unknown: string[] }}
 */
export function compareMigrations(local, remote) {
  const remoteSet = new Set(remote);
  const localSet = new Set(local);
  return {
    pending: [...localSet].filter((version) => !remoteSet.has(version)).sort(),
    unknown: [...remoteSet].filter((version) => !localSet.has(version)).sort(),
  };
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: migration-drift.mjs <migrations-dir> < remote-versions");
  const remote = (await readStdin()).split("\n").map((line) => line.trim()).filter(Boolean);
  if (remote.some((version) => !/^\d{14}$/.test(version))) throw new Error("unexpected production migration version");
  const local = localMigrationVersions(dir);
  const { pending, unknown } = compareMigrations(local, remote);
  if (pending.length) console.error(`not applied in production: ${pending.join(", ")}`);
  if (unknown.length) console.error(`in production but not in the repository: ${unknown.join(", ")}`);
  if (pending.length || unknown.length) {
    console.error("Apply with `supabase db push --linked` (dry run first) or repair the history — see the backup runbook.");
    process.exitCode = 1;
    return;
  }
  console.log(`Production migrations in sync: ${local.length} migrations.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
