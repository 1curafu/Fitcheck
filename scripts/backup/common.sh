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

configure_supabase_rclone() {
  export RCLONE_CONFIG_SUPABASE_TYPE=s3
  export RCLONE_CONFIG_SUPABASE_PROVIDER=Other
  export RCLONE_CONFIG_SUPABASE_ACCESS_KEY_ID="$SUPABASE_S3_ACCESS_KEY_ID"
  export RCLONE_CONFIG_SUPABASE_SECRET_ACCESS_KEY="$SUPABASE_S3_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_SUPABASE_ENDPOINT="https://${SUPABASE_PROJECT_REF}.storage.supabase.co/storage/v1/s3"
  export RCLONE_CONFIG_SUPABASE_ACL=private
  export RCLONE_CONFIG_SUPABASE_NO_CHECK_BUCKET=true
}

