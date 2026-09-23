import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const backupDir = resolve(here, "..");
const runScript = join(backupDir, "run.sh");
const localScript = join(backupDir, "local.sh");
const restoreScript = join(backupDir, "restore.sh");

function fakeCommandPath(names: string[]) {
  const fixture = mkdtempSync(join(tmpdir(), "fitcheck-backup-commands-"));
  const bin = join(fixture, "bin");
  spawnSync("mkdir", ["-p", bin]);
  symlinkSync(process.execPath, join(bin, "node"));
  for (const name of names) {
    const path = join(bin, name);
    writeFileSync(path, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(path, 0o755);
  }
  return { fixture, path: `${bin}:${process.env.PATH ?? ""}` };
}

function run(path: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync("bash", [path, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      PATH: env.PATH ?? process.env.PATH ?? "",
    },
  });
}

function restoreFixture(
  createdAt = new Date().toISOString(),
  rolesSql = "roles\n",
  dataSql = "data\n",
  platformSql: string | null = "-- fitcheck-platform-objects policies=1 triggers=1\ncreate policy wardrobe_rw_own on storage.objects;\n",
) {
  const fixture = mkdtempSync(join(tmpdir(), "fitcheck-restore-runner-"));
  const snapshot = join(fixture, "snapshot");
  const database = join(snapshot, "database");
  const wardrobe = join(snapshot, "storage", "wardrobe");
  const bin = join(fixture, "bin");
  const trace = join(fixture, "trace.txt");
  mkdirSync(database, { recursive: true });
  mkdirSync(wardrobe, { recursive: true });
  mkdirSync(bin, { recursive: true });

  const dumps: Record<string, string> = {
    "roles.sql": rolesSql,
    "schema.sql": "schema\n",
    "data.sql": dataSql,
    "migration-history-schema.sql": "history schema\n",
    "migration-history-data.sql": "history data\n",
  };
  if (platformSql !== null) dumps["platform-objects.sql"] = platformSql;
  for (const [name, contents] of Object.entries(dumps)) writeFileSync(join(database, name), contents);
  const databaseManifest = Object.fromEntries(
    Object.entries(dumps).map(([name, contents]) => [name, {
      bytes: Buffer.byteLength(contents),
      sha256: createHash("sha256").update(contents).digest("hex"),
    }]),
  );
  writeFileSync(join(snapshot, "manifest.json"), `${JSON.stringify({
    formatVersion: 1,
    createdAt,
    projectRef: "source-ref",
    metadata: {},
    toolVersions: {},
    database: databaseManifest,
    storage: { bucket: "wardrobe", objectCount: 0, totalBytes: 0 },
  })}\n`);

  const executable = (name: string, source: string) => {
    const path = join(bin, name);
    writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\n${source}\n`);
    chmodSync(path, 0o755);
  };
  executable("restic", `
if [[ "\${1:-}" == "restore" ]]; then
  while [[ "$#" -gt 0 ]]; do
    if [[ "$1" == "--target" ]]; then cp -R "$SNAPSHOT/." "$2"; exit 0; fi
    shift
  done
fi
exit 1
`);
  // Behaves like a Supabase project's non-superuser \`postgres\`: a grant on a parameter to a platform-owned
  // \`supabase_*\` role is refused. Records the roles file it was given.
  executable("psql", `
if [[ " $* " != *" --file "* ]]; then
  printf 'probe\\n' >> "$TRACE"
  [[ -n "\${TARGET_PROBE_FAIL:-}" ]] && { echo 'probe failed' >&2; exit 2; }
  if [[ "$*" == *pg_policies* ]]; then echo "\${TARGET_PLATFORM_COUNTS:-1|1}"; exit 0; fi
  echo "\${TARGET_PUBLIC_TABLES:-0}"
  exit 0
fi
printf 'psql\\n' >> "$TRACE"
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "--file" && "$2" == *platform-objects.sql ]]; then
    printf 'platform-file:\\n' >> "$TRACE"; cat "$2" >> "$TRACE"
  fi
  if [[ "$1" == "--file" && "$2" == *data*.sql ]]; then
    printf 'data-file:\\n' >> "$TRACE"; cat "$2" >> "$TRACE"
  fi
  if [[ "$1" == "--file" && "$2" == *roles*.sql ]]; then
    printf 'roles-file:\\n' >> "$TRACE"; cat "$2" >> "$TRACE"
    if grep -qE '^GRANT SET ON PARAMETER .* TO "supabase_' "$2"; then
      echo 'ERROR:  permission denied for parameter log_min_messages' >&2; exit 3
    fi
  fi
  shift
done
`);
  executable("rclone", `
case "\${1:-}" in
  copy) printf 'rclone-copy\\n' >> "$TRACE" ;;
  check) printf 'rclone-check %s\\n' "$*" >> "$TRACE" ;;
  size) printf '{"count":0,"bytes":0}\\n' ;;
  *) exit 1 ;;
esac
`);
  executable("node", `
if [[ "\${1:-}" == *"reconcile-deletions.mjs" ]]; then
  if [[ "\${2:-}" == "validate-config" ]]; then
    exec "$NODE_BINARY" "$@"
  fi
  printf 'reconcile\\n' >> "$TRACE"
  printf 'Deletion reconciliation complete: scanned=0 deleted=0\\n'
  exit "\${RECONCILE_STATUS:-0}"
fi
exec "$NODE_BINARY" "$@"
`);

  const env: Record<string, string> = {
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    NODE_BINARY: process.execPath,
    SNAPSHOT: snapshot,
    TRACE: trace,
    BACKUP_SOURCE_PROJECT_REF: "source-ref",
    RESTORE_PROJECT_REF: "restore-ref",
    RESTORE_DB_URL: "postgresql://postgres.restore-ref:restore-secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
    RESTORE_SUPABASE_URL: "https://restore-ref.supabase.co",
    RESTORE_SERVICE_ROLE_KEY: "restore-service-role-secret",
    RESTORE_S3_ACCESS_KEY_ID: "restore-storage-key",
    RESTORE_S3_SECRET_ACCESS_KEY: "restore-storage-secret",
    B2_DELETION_READER_KEY_ID: "reader-key-id",
    B2_DELETION_READER_APPLICATION_KEY: "reader-application-key-secret",
    DELETION_LEDGER_HMAC_KEY: "ledger-hmac-secret",
    RESTIC_REPOSITORY: "/tmp/fitcheck-test-restic",
    RESTIC_PASSWORD: "repository-password",
  };

  return {
    fixture,
    trace,
    env,
  };
}

function restoreTrace(path: string) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

describe("backup runner guardrails", () => {
  test("rejects an unknown backup mode before doing any work", () => {
    const result = run(runScript, ["surprise"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("mode must be nightly or manual");
  });

  test("names a missing environment variable without printing existing secrets", () => {
    const secret = "postgres://owner:do-not-print@example.invalid/postgres";
    const result = run(runScript, ["nightly"], { SUPABASE_DB_URL: secret });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("SUPABASE_PROJECT_REF");
    expect(result.stderr).not.toContain(secret);
    expect(result.stderr).not.toContain("do-not-print");
  });

  test("fails closed when the restic encryption password is missing", () => {
    const databaseUrl =
      "postgresql://postgres.project-ref:do-not-print@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
    const result = run(runScript, ["manual"], {
      SUPABASE_DB_URL: databaseUrl,
      SUPABASE_PROJECT_REF: "project-ref",
      SUPABASE_S3_ACCESS_KEY_ID: "source-key",
      SUPABASE_S3_SECRET_ACCESS_KEY: "source-secret",
      RESTIC_REPOSITORY: "/tmp/fitcheck-test-restic",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("RESTIC_PASSWORD");
    expect(result.stderr).not.toContain(databaseUrl);
    expect(result.stderr).not.toContain("do-not-print");
  });

  test("refuses to label a database backup with a different Supabase project ref", () => {
    const commands = fakeCommandPath(["docker", "supabase", "rclone", "restic", "psql"]);
    const databaseUrl =
      "postgresql://postgres.actual-ref:do-not-print@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

    try {
      const result = run(runScript, ["manual"], {
        PATH: commands.path,
        SUPABASE_DB_URL: databaseUrl,
        SUPABASE_PROJECT_REF: "claimed-ref",
        SUPABASE_S3_ACCESS_KEY_ID: "source-key",
        SUPABASE_S3_SECRET_ACCESS_KEY: "source-secret",
        RESTIC_REPOSITORY: "/tmp/fitcheck-test-restic",
        RESTIC_PASSWORD: "repository-password",
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        "SUPABASE_DB_URL does not match SUPABASE_PROJECT_REF",
      );
      expect(result.stderr).not.toContain(databaseUrl);
      expect(result.stderr).not.toContain("do-not-print");
    } finally {
      rmSync(commands.fixture, { recursive: true, force: true });
    }
  });

  test("requires the external SSD destination argument", () => {
    const result = run(localScript, []);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("external-backup-directory");
  });

  test("refuses a local repository on the system disk", () => {
    const result = run(localScript, [process.cwd()]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("external volume");
  });

  test("backs up only the validated stage, never restic's working cache", () => {
    const fixture = mkdtempSync(join(tmpdir(), "fitcheck-backup-runner-"));
    const bin = join(fixture, "bin");
    const trace = join(fixture, "restic-trace.txt");
    spawnSync("mkdir", ["-p", bin]);

    const executable = (name: string, source: string) => {
      const path = join(bin, name);
      writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\n${source}\n`);
      chmodSync(path, 0o755);
    };

    executable(
      "supabase",
      `
if [[ "\${1:-}" == "--version" ]]; then echo "2.109.1"; exit 0; fi
output=""
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "-f" ]]; then output="$2"; shift 2; else shift; fi
done
printf 'dump\\n' > "$output"
`,
    );
    executable(
      "rclone",
      `
case "\${1:-}" in
  copy) mkdir -p "$3/user/item"; printf 'abc' > "$3/user/item/original.jpg" ;;
  size) printf '{"count":1,"bytes":3}\\n' ;;
  version) echo "rclone v1.75.1" ;;
esac
`,
    );
    executable(
      "restic",
      `
case "\${1:-}" in
  version) echo "restic 0.19.1" ;;
  cat) exit 0 ;;
  backup)
    mkdir -p "$RESTIC_CACHE_DIR"
    printf 'cache' > "$RESTIC_CACHE_DIR/index"
    { printf 'pwd=%s\\n' "$PWD"; find . -type f -print | sort; } > "$TRACE"
    ;;
  snapshots) echo '[]' ;;
  check) exit 0 ;;
esac
`,
    );
    executable("psql", `
if [[ " $* " == *" -f "* ]]; then
  if [[ -n "\${PLATFORM_CAPTURE_OUTPUT:-}" ]]; then printf '%s\\n' "$PLATFORM_CAPTURE_OUTPUT"; exit 0; fi
  printf -- '-- fitcheck-platform-objects policies=1 triggers=1\\ncreate policy wardrobe_rw_own on storage.objects;\\n'
  exit 0
fi
echo "psql (PostgreSQL) 18.3"
`);
    executable("docker", `exit 0`);
    symlinkSync(process.execPath, join(bin, "node"));

    try {
      const result = run(runScript, ["nightly"], {
        PATH: `${bin}:${process.env.PATH ?? ""}`,
        TRACE: trace,
        SUPABASE_DB_URL:
          "postgresql://postgres.project-ref:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
        SUPABASE_PROJECT_REF: "project-ref",
        SUPABASE_S3_ACCESS_KEY_ID: "source-key",
        SUPABASE_S3_SECRET_ACCESS_KEY: "source-secret",
        RESTIC_REPOSITORY: "s3:example.invalid/bucket/nightly",
        RESTIC_PASSWORD: "repository-password",
        AWS_ACCESS_KEY_ID: "destination-key",
        AWS_SECRET_ACCESS_KEY: "destination-secret",
      });

      expect(result.status, result.stderr).toBe(0);
      const backedUp = readFileSync(trace, "utf8");
      expect(backedUp).toContain("./manifest.json");
      expect(backedUp).toContain("./database/data.sql");
      expect(backedUp).toContain("./storage/wardrobe/user/item/original.jpg");
      expect(backedUp).toContain("./database/platform-objects.sql");
      expect(backedUp).not.toContain("restic-cache");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  test("restore requires an explicit disposable-target confirmation", () => {
    const result = run(restoreScript, ["latest"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--confirm-disposable-target");
  });

  test("restore refuses to target the source project without printing its database URL", () => {
    const databaseUrl = "postgres://owner:restore-secret@example.invalid/postgres";
    const result = run(
      restoreScript,
      ["latest", "--confirm-disposable-target"],
      {
        BACKUP_SOURCE_PROJECT_REF: "production-ref",
        RESTORE_PROJECT_REF: "production-ref",
        RESTORE_DB_URL: databaseUrl,
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("must differ from the backup source project");
    expect(result.stderr).not.toContain(databaseUrl);
    expect(result.stderr).not.toContain("restore-secret");
  });

  test("restore refuses a database URL for a project other than the confirmed target", () => {
    const commands = fakeCommandPath(["rclone", "restic", "psql"]);
    const databaseUrl =
      "postgresql://postgres.actual-ref:restore-secret@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

    try {
      const result = run(
        restoreScript,
        ["latest", "--confirm-disposable-target"],
        {
          PATH: commands.path,
          BACKUP_SOURCE_PROJECT_REF: "production-ref",
          RESTORE_PROJECT_REF: "claimed-scratch-ref",
          RESTORE_DB_URL: databaseUrl,
          RESTORE_S3_ACCESS_KEY_ID: "target-key",
          RESTORE_S3_SECRET_ACCESS_KEY: "target-secret",
          RESTIC_REPOSITORY: "/tmp/fitcheck-test-restic",
          RESTIC_PASSWORD: "repository-password",
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(
        "RESTORE_DB_URL does not match RESTORE_PROJECT_REF",
      );
      expect(result.stderr).not.toContain(databaseUrl);
      expect(result.stderr).not.toContain("restore-secret");
    } finally {
      rmSync(commands.fixture, { recursive: true, force: true });
    }
  });

  test.each([
    "RESTORE_SUPABASE_URL",
    "RESTORE_SERVICE_ROLE_KEY",
    "B2_DELETION_READER_KEY_ID",
    "B2_DELETION_READER_APPLICATION_KEY",
    "DELETION_LEDGER_HMAC_KEY",
  ])("restore refuses a missing %s before mutating the target", (missing) => {
    const fixture = restoreFixture();
    const env = { ...fixture.env };
    delete env[missing];

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], env);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(missing);
      expect(restoreTrace(fixture.trace)).not.toContain("psql");
      expect(restoreTrace(fixture.trace)).not.toContain("rclone");
      expect(`${result.stdout}${result.stderr}`).not.toContain("restore-service-role-secret");
      expect(`${result.stdout}${result.stderr}`).not.toContain("reader-application-key-secret");
      expect(`${result.stdout}${result.stderr}`).not.toContain("ledger-hmac-secret");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("restore rejects a RESTORE_SUPABASE_URL for another project before psql", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        RESTORE_SUPABASE_URL: "https://other-ref.supabase.co",
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("RESTORE_SUPABASE_URL does not match RESTORE_PROJECT_REF");
      expect(restoreTrace(fixture.trace)).not.toContain("psql");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("restore rejects malformed retained HMAC keys before target mutation without printing them", () => {
    const fixture = restoreFixture();
    const malformed = '{"previous-hmac-key-secret":true}';

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        DELETION_LEDGER_PREVIOUS_HMAC_KEYS_JSON: malformed,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toBe("Deletion reconciliation configuration is invalid\n");
      expect(`${result.stdout}${result.stderr}`).not.toContain("previous-hmac-key-secret");
      expect(restoreTrace(fixture.trace)).not.toContain("psql");
      expect(restoreTrace(fixture.trace)).not.toContain("rclone");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("runs mandatory deletion reconciliation after database and Storage restore", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);
      const trace = restoreTrace(fixture.trace);

      expect(result.status, result.stderr).toBe(0);
      expect(trace).toMatch(/psql[\s\S]*rclone-copy[\s\S]*rclone-check[\s\S]*reconcile/);
      expect(result.stdout).toContain("Deletion reconciliation complete");
      expect(result.stdout).not.toContain("replay every deletion request");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("skips grants to Supabase-owned platform roles that a project's postgres role may not replay", () => {
    const roles = [
      'ALTER ROLE "anon" SET "statement_timeout" TO \'3s\';',
      'GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";',
      "",
    ].join("\n");
    const fixture = restoreFixture(undefined, roles);

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);
      const trace = restoreTrace(fixture.trace);

      expect(result.status, result.stderr).toBe(0);
      expect(trace).toContain('ALTER ROLE "anon" SET "statement_timeout"');
      expect(trace).not.toContain("supabase_realtime_admin");
      expect(result.stdout).toContain("Skipped 1 grant(s) to Supabase-managed platform roles");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("still replays grants to roles Fitcheck owns", () => {
    const roles = 'GRANT SET ON PARAMETER "work_mem" TO "fitcheck_reporter";\n';
    const fixture = restoreFixture(undefined, roles);

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);

      expect(result.status, result.stderr).toBe(0);
      expect(restoreTrace(fixture.trace)).toContain('TO "fitcheck_reporter"');
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("refuses a target project that already has tables, before downloading or touching it", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        TARGET_PUBLIC_TABLES: "10",
      });
      const trace = restoreTrace(fixture.trace);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("restore target is not empty");
      expect(result.stdout).not.toContain("Restoring encrypted snapshot");
      expect(trace).toContain("probe");
      expect(trace).not.toContain("psql");
      expect(trace).not.toContain("rclone");
      expect(result.stderr).not.toContain("restore-secret");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("fails closed when the target emptiness check cannot run", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        TARGET_PROBE_FAIL: "1",
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("could not inspect the restore target");
      expect(restoreTrace(fixture.trace)).not.toContain("psql");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("replays no Storage object records, so the upload recreates every one with real bytes behind it", () => {
    const data = [
      'COPY "public"."items" ("id") FROM stdin;',
      "item-row",
      "\\.",
      'COPY "storage"."buckets" ("id") FROM stdin;',
      "wardrobe",
      "\\.",
      'COPY "storage"."objects" ("id", "name") FROM stdin;',
      "object-row-1\towner/item/original.jpg",
      "object-row-2\towner/item/cutout.webp",
      "\\.",
      'COPY "storage"."s3_multipart_uploads" ("id") FROM stdin;',
      "upload-row",
      "\\.",
      'COPY "storage"."s3_multipart_uploads_parts" ("id") FROM stdin;',
      "part-row",
      "\\.",
      'COPY "auth"."users" ("id") FROM stdin;',
      "user-row",
      "\\.",
      "",
    ].join("\n");
    const fixture = restoreFixture(undefined, undefined, data);

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);
      const trace = restoreTrace(fixture.trace);

      expect(result.status, result.stderr).toBe(0);
      expect(trace).toContain("item-row");
      expect(trace).toContain('COPY "storage"."buckets"');
      expect(trace).toContain("user-row");
      expect(trace).not.toContain("object-row");
      expect(trace).not.toContain("upload-row");
      expect(trace).not.toContain("part-row");
      expect(result.stdout).toContain("Skipped 3 Storage table(s)");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("verifies restored photos by downloading their bytes, not by listed sizes", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);
      const check = restoreTrace(fixture.trace).split("\n").find((line) => line.startsWith("rclone-check")) ?? "";

      expect(result.status, result.stderr).toBe(0);
      expect(check).toContain("--download");
      expect(check).not.toContain("--size-only");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("replays the captured auth/storage policies and triggers after the database, before the photos", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);
      const trace = restoreTrace(fixture.trace);

      expect(result.status, result.stderr).toBe(0);
      expect(trace).toMatch(/history data[\s\S]*platform-file:\n-- fitcheck-platform-objects[\s\S]*wardrobe_rw_own[\s\S]*rclone-copy/);
      expect(result.stdout).toContain("Restored 1 auth/storage policies and 1 auth triggers.");
      expect(result.stdout).not.toContain("WARNING");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("fails when the target does not end up with the captured policies and triggers", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        TARGET_PLATFORM_COUNTS: "0|1",
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("do not match the snapshot");
      expect(restoreTrace(fixture.trace)).not.toContain("rclone-copy");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("warns loudly when an older snapshot has no captured policies or triggers", () => {
    const fixture = restoreFixture(undefined, undefined, undefined, null);

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);

      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain("WARNING: this snapshot predates auth/storage capture");
      expect(result.stdout).toContain("NOT restored");
      expect(restoreTrace(fixture.trace)).not.toContain("platform-file");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("fails the restore when deletion reconciliation fails", () => {
    const fixture = restoreFixture();

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], {
        ...fixture.env,
        RECONCILE_STATUS: "1",
      });

      expect(result.status).not.toBe(0);
      expect(restoreTrace(fixture.trace)).toContain("reconcile");
      expect(result.stdout).not.toContain("Snapshot bytes and database dumps restored successfully.");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test.each([
    undefined,
    "not-a-date",
    new Date(Date.now() + 60_000).toISOString(),
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 - 1).toISOString(),
  ])("refuses a %s manifest age before psql or rclone", (createdAt) => {
    const fixture = restoreFixture(createdAt as string);
    if (createdAt === undefined) {
      const manifest = JSON.parse(readFileSync(join(fixture.fixture, "snapshot", "manifest.json"), "utf8"));
      delete manifest.createdAt;
      writeFileSync(join(fixture.fixture, "snapshot", "manifest.json"), `${JSON.stringify(manifest)}\n`);
    }

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);

      expect(result.status).not.toBe(0);
      expect(restoreTrace(fixture.trace)).not.toContain("psql");
      expect(restoreTrace(fixture.trace)).not.toContain("rclone");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("accepts a manifest inside the hard 30-day restore ceiling", () => {
    const fixture = restoreFixture(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 60_000).toISOString());

    try {
      const result = run(restoreScript, ["latest", "--confirm-disposable-target"], fixture.env);

      expect(result.status, result.stderr).toBe(0);
      expect(restoreTrace(fixture.trace)).toContain("psql");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });
});

describe("restic repository initialisation", () => {
  function initFixture(catExit: number) {
    const fixture = mkdtempSync(join(tmpdir(), "fitcheck-backup-init-"));
    const bin = join(fixture, "bin");
    const trace = join(fixture, "restic-calls.txt");
    mkdirSync(bin, { recursive: true });
    const executable = (name: string, source: string) => {
      const path = join(bin, name);
      writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\n${source}\n`);
      chmodSync(path, 0o755);
    };
    executable(
      "supabase",
      `
if [[ "\${1:-}" == "--version" ]]; then echo "2.109.1"; exit 0; fi
output=""
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "-f" ]]; then output="$2"; shift 2; else shift; fi
done
printf 'dump\\n' > "$output"
`,
    );
    executable(
      "rclone",
      `
case "\${1:-}" in
  copy) mkdir -p "$3/user/item"; printf 'abc' > "$3/user/item/original.jpg" ;;
  size) printf '{"count":1,"bytes":3}\\n' ;;
  version) echo "rclone v1.75.1" ;;
esac
`,
    );
    executable(
      "restic",
      `
printf '%s\\n' "\${1:-}" >> "$TRACE"
case "\${1:-}" in
  version) echo "restic 0.19.1" ;;
  cat) exit ${catExit} ;;
  snapshots) echo '[]' ;;
esac
`,
    );
    executable("psql", `
if [[ " $* " == *" -f "* ]]; then
  if [[ -n "\${PLATFORM_CAPTURE_OUTPUT:-}" ]]; then printf '%s\\n' "$PLATFORM_CAPTURE_OUTPUT"; exit 0; fi
  printf -- '-- fitcheck-platform-objects policies=1 triggers=1\\ncreate policy wardrobe_rw_own on storage.objects;\\n'
  exit 0
fi
echo "psql (PostgreSQL) 18.3"
`);
    executable("docker", `exit 0`);
    symlinkSync(process.execPath, join(bin, "node"));
    return { fixture, bin, trace };
  }

  function runWith(repository: string, fixture: ReturnType<typeof initFixture>) {
    return run(runScript, ["manual"], {
      PATH: `${fixture.bin}:${process.env.PATH ?? ""}`,
      TRACE: fixture.trace,
      SUPABASE_DB_URL:
        "postgresql://postgres.project-ref:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
      SUPABASE_PROJECT_REF: "project-ref",
      SUPABASE_S3_ACCESS_KEY_ID: "source-key",
      SUPABASE_S3_SECRET_ACCESS_KEY: "source-secret",
      RESTIC_REPOSITORY: repository,
      RESTIC_PASSWORD: "repository-password",
      AWS_ACCESS_KEY_ID: "destination-key",
      AWS_SECRET_ACCESS_KEY: "destination-secret",
    });
  }

  const calls = (trace: string) => readFileSync(trace, "utf8").trim().split("\n");

  test("never initialises an unreadable S3 repository, and stops before dumping production", () => {
    const fixture = initFixture(1);
    try {
      const result = runWith("s3:example.invalid/bucket/nightly", fixture);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("refusing to initialise");
      expect(calls(fixture.trace)).not.toContain("init");
      expect(result.stdout).not.toContain("Creating Supabase database dumps");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("never initialises over an existing local repository directory it cannot read", () => {
    const fixture = initFixture(1);
    const repository = join(fixture.fixture, "existing-restic");
    mkdirSync(repository);
    try {
      const result = runWith(repository, fixture);
      expect(result.status).not.toBe(0);
      expect(calls(fixture.trace)).not.toContain("init");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("initialises a brand-new local SSD repository directory once", () => {
    const fixture = initFixture(1);
    try {
      const result = runWith(join(fixture.fixture, "new-restic"), fixture);
      expect(result.status, result.stderr).toBe(0);
      expect(calls(fixture.trace).filter((call) => call === "init")).toHaveLength(1);
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("stops before writing a snapshot when the platform-object capture has no header", () => {
    const fixture = initFixture(0);
    try {
      const result = run(runScript, ["manual"], {
        PATH: `${fixture.bin}:${process.env.PATH ?? ""}`,
        TRACE: fixture.trace,
        PLATFORM_CAPTURE_OUTPUT: "not the capture query output",
        SUPABASE_DB_URL:
          "postgresql://postgres.project-ref:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
        SUPABASE_PROJECT_REF: "project-ref",
        SUPABASE_S3_ACCESS_KEY_ID: "source-key",
        SUPABASE_S3_SECRET_ACCESS_KEY: "source-secret",
        RESTIC_REPOSITORY: "s3:example.invalid/bucket/nightly",
        RESTIC_PASSWORD: "repository-password",
        AWS_ACCESS_KEY_ID: "destination-key",
        AWS_SECRET_ACCESS_KEY: "destination-secret",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("platform object capture");
      expect(calls(fixture.trace)).not.toContain("backup");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });

  test("uses a readable repository without initialising it", () => {
    const fixture = initFixture(0);
    try {
      const result = runWith("s3:example.invalid/bucket/nightly", fixture);
      expect(result.status, result.stderr).toBe(0);
      expect(calls(fixture.trace)).not.toContain("init");
    } finally {
      rmSync(fixture.fixture, { recursive: true, force: true });
    }
  });
});
