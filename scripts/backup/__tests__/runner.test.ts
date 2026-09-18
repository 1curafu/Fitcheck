import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const backupDir = resolve(here, "..");
const runScript = join(backupDir, "run.sh");
const localScript = join(backupDir, "local.sh");

function run(path: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync("bash", [path, ...args], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", ...env },
  });
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

  test("requires the external SSD destination argument", () => {
    const result = run(localScript, []);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("external-volume-directory");
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
    executable("psql", `echo "psql (PostgreSQL) 18.3"`);
    symlinkSync(process.execPath, join(bin, "node"));

    try {
      const result = run(runScript, ["nightly"], {
        PATH: `${bin}:${process.env.PATH ?? ""}`,
        TRACE: trace,
        SUPABASE_DB_URL: "postgres://example.invalid/postgres",
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
      expect(backedUp).not.toContain("restic-cache");
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
