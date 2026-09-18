#!/usr/bin/env bash

backup_die() {
  printf 'backup: %s\n' "$1" >&2
  exit 1
}
require_backup_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    backup_die "required environment variable ${name} is missing"
  fi
}

require_backup_command() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || backup_die "required command ${name} is not installed"
}

require_supabase_db_url_matches_project_ref() {
  local url_name="$1"
  local ref_name="$2"

  if ! node - "$url_name" "$ref_name" <<'NODE'
const [urlName, refName] = process.argv.slice(2);
const rawUrl = process.env[urlName];
const projectRef = process.env[refName];

try {
  const url = new URL(rawUrl);
  const username = decodeURIComponent(url.username);
  const direct =
    username === "postgres" &&
    url.hostname === `db.${projectRef}.supabase.co`;
  const sessionPooler =
    username === `postgres.${projectRef}` &&
    url.hostname.endsWith(".pooler.supabase.com");

  if (!(["postgres:", "postgresql:"].includes(url.protocol) && (direct || sessionPooler))) {
    process.exit(1);
  }
} catch {
  process.exit(1);
}
NODE
  then
    backup_die "${url_name} does not match ${ref_name}"
  fi
}

configure_supabase_rclone() {
  export RCLONE_CONFIG_SUPABASE_TYPE=s3
  export RCLONE_CONFIG_SUPABASE_PROVIDER=Other
  export RCLONE_CONFIG_SUPABASE_ACCESS_KEY_ID="$SUPABASE_S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_SUPABASE_SECRET_ACCESS_KEY="$SUPABASE_S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_SUPABASE_ENDPOINT="https://${SUPABASE_PROJECT_REF}.storage.supabase.co/storage/v1/s3"
  export RCLONE_CONFIG_SUPABASE_ACL=private
  export RCLONE_CONFIG_SUPABASE_NO_CHECK_BUCKET=true
}
