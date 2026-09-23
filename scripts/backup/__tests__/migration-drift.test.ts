import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { compareMigrations, localMigrationVersions } from "../migration-drift.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoMigrations = resolve(here, "../../../supabase/migrations");
const checkScript = resolve(here, "../check-migrations.sh");

describe("compareMigrations", () => {
  test("in sync when both sides hold the same versions", () => {
    expect(compareMigrations(["1", "2"], ["2", "1"])).toEqual({ pending: [], unknown: [] });
  });

  test("names repository migrations production has not applied", () => {
    expect(compareMigrations(["1", "2", "3"], ["1"])).toEqual({ pending: ["2", "3"], unknown: [] });
  });

  test("names versions production has that the repository does not", () => {
    expect(compareMigrations(["1"], ["1", "20260910123330"])).toEqual({ pending: [], unknown: ["20260910123330"] });
  });
});

describe("localMigrationVersions", () => {
  test("reads the real migrations folder: sorted, unique, 14-digit versions", () => {
    const versions = localMigrationVersions(repoMigrations);
    expect(versions.length).toBeGreaterThanOrEqual(25);
    expect(versions).toContain("20260919090000");
    expect(new Set(versions).size).toBe(versions.length);
    expect([...versions].sort()).toEqual(versions);
    for (const version of versions) expect(version).toMatch(/^\d{14}$/);
  });

  test("refuses a file that does not follow <14 digits>_<name>.sql", () => {
    const dir = mkdtempSync(join(tmpdir(), "fitcheck-migrations-"));
    try {
      writeFileSync(join(dir, "20260101000000_ok.sql"), "select 1;");
      writeFileSync(join(dir, "oops.sql"), "select 1;");
      expect(() => localMigrationVersions(dir)).toThrow("oops.sql");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("check-migrations.sh", () => {
  function fixture(remote: string, psqlExit = 0) {
    const root = mkdtempSync(join(tmpdir(), "fitcheck-drift-"));
    const bin = join(root, "bin");
    const migrations = join(root, "migrations");
    mkdirSync(bin);
    mkdirSync(migrations);
    writeFileSync(join(migrations, "20260101000000_first.sql"), "select 1;");
    writeFileSync(join(migrations, "20260102000000_second.sql"), "select 1;");
    writeFileSync(join(bin, "psql"), `#!/usr/bin/env bash\nprintf '%s' "$REMOTE"\nexit ${psqlExit}\n`);
    chmodSync(join(bin, "psql"), 0o755);
    symlinkSync(process.execPath, join(bin, "node"));
    const run = (env: Record<string, string> = {}) =>
      spawnSync("bash", [checkScript], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH ?? ""}`,
          REMOTE: remote,
          MIGRATIONS_DIR: migrations,
          SUPABASE_PROJECT_REF: "project-ref",
          SUPABASE_DB_URL: "postgresql://postgres.project-ref:secret-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
          ...env,
        },
      });
    return { root, run };
  }

  test("passes when production matches the repository", () => {
    const f = fixture("20260101000000\n20260102000000\n");
    try {
      const result = f.run();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("in sync: 2 migrations");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("fails and names a migration production has not applied", () => {
    const f = fixture("20260101000000\n");
    try {
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("not applied in production: 20260102000000");
      expect(result.stderr).not.toContain("secret-password");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("fails and names a production version the repository does not have", () => {
    const f = fixture("20260101000000\n20260102000000\n20260910123330\n");
    try {
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("in production but not in the repository: 20260910123330");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("fails closed when production cannot be read", () => {
    const f = fixture("", 2);
    try {
      const result = f.run();
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain("in sync");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });

  test("refuses a database URL for a different project", () => {
    const f = fixture("20260101000000\n20260102000000\n");
    try {
      const result = f.run({ SUPABASE_PROJECT_REF: "another-ref" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("does not match");
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  });
});
