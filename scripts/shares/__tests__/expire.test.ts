import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "vitest";

function runFixture(claimMode: "allow" | "skip") {
  const root = mkdtempSync(join(tmpdir(), "fitcheck-share-expiry-"));
  const bin = join(root, "bin");
  mkdirSync(bin);
  const psql = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *"public.look_shares"* ]]; then
  printf '%s\\n' '[{"token":"old","ready_at":"2000-01-01T00:00:00Z","created_at":"2000-01-01T00:00:00Z"},{"token":"live","ready_at":"2099-01-01T00:00:00Z","created_at":"2000-01-01T00:00:00Z"}]'
elif [[ "$*" == *"storage.objects"* ]]; then
  printf '%s\\n' '[{"name":"old","modTime":"2000-01-01T00:00:00Z"},{"name":"live","modTime":"2000-01-01T00:00:00Z"},{"name":"ghost-old","modTime":"2000-01-01T00:00:00Z"},{"name":"ghost-new","modTime":"2099-01-01T00:00:00Z"}]'
else
  statement="$(cat)"
  for arg in "$@"; do :; done
  if [[ "$statement" == *"with claimed as"* ]]; then
    if [[ "$TEST_CLAIM_MODE" == "allow" ]]; then printf '%s\\n' "\${arg#token=}"; fi
  else
    printf 'row:%s\\n' "$arg" >> "$TEST_LOG"
  fi
fi
`;
  const rclone = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "lsjson" && "$2" == "--dirs-only" ]]; then
  printf '%s\\n' '[{"Name":"old","ModTime":"2000-01-01T00:00:00Z"},{"Name":"live","ModTime":"2000-01-01T00:00:00Z"},{"Name":"ghost-old","ModTime":"2000-01-01T00:00:00Z"},{"Name":"ghost-new","ModTime":"2000-01-01T00:00:00Z"}]'
elif [[ "$1" == "lsjson" ]]; then
  for token in "$@"; do :; done
  if [[ "$token" == "supabase:shares" ]]; then
    printf '%s\\n' '[{"Path":"old/story.jpg","ModTime":"2000-01-01T00:00:00Z"},{"Path":"live/story.jpg","ModTime":"2000-01-01T00:00:00Z"},{"Path":"ghost-old/story.jpg","ModTime":"2000-01-01T00:00:00Z"},{"Path":"ghost-new/story.jpg","ModTime":"2000-01-01T00:00:00Z"}]'
    exit 0
  fi
  token="$(basename "$token")"
  if [[ -f "$TEST_STATE/$token.removed" || "$token" == "live" ]]; then
    [[ "$token" == "live" ]] && printf '%s\\n' '[{"Path":"story.jpg"}]' || printf '%s\\n' '[]'
  else
    printf '%s\\n' '[{"Path":"story.jpg"}]'
  fi
elif [[ "$1" == "deletefile" ]]; then
  token="$(basename "$(dirname "$2")")"
  touch "$TEST_STATE/$token.removed"
  printf 'image:%s\\n' "$token" >> "$TEST_LOG"
else
  exit 2
fi
`;
  try {
    for (const [name, body] of [["psql", psql], ["rclone", rclone]]) {
      const path = join(bin, name);
      writeFileSync(path, body);
      chmodSync(path, 0o755);
    }
    writeFileSync(join(root, "log"), "");
    const output = execFileSync("bash", ["scripts/shares/expire.sh"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        TEST_LOG: join(root, "log"),
        TEST_STATE: root,
        TEST_CLAIM_MODE: claimMode,
        SUPABASE_DB_URL: "postgresql://postgres@db.local.supabase.co/postgres",
        SUPABASE_PROJECT_REF: "local",
        SUPABASE_S3_ACCESS_KEY_ID: "fixture",
        SUPABASE_S3_SECRET_ACCESS_KEY: "fixture",
      },
    });
    return { output, calls: readFileSync(join(root, "log"), "utf8").trim().split("\n") };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("the nightly job removes expired rows and orphan images while preserving live shares", () => {
  const { output, calls } = runFixture("allow");
  expect(output).toContain("1 expired share(s) removed, 1 orphan folder(s) removed");
  expect(calls).toEqual(["image:old", "row:token=old", "image:ghost-old"]);
});

test("a share refreshed after the snapshot is skipped before any of its images are touched", () => {
  const { output, calls } = runFixture("skip");
  expect(output).toContain("0 expired share(s) removed, 1 orphan folder(s) removed");
  expect(calls).toEqual(["image:ghost-old"]);
});
