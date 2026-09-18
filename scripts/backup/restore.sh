#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

SNAPSHOT_ID="${1:-}"
CONFIRMATION="${2:-}"
if [[ -z "$SNAPSHOT_ID" || "$CONFIRMATION" != "--confirm-disposable-target" || "$#" -ne 2 ]]; then
  backup_die "usage: restore.sh <snapshot-id|latest> --confirm-disposable-target"
fi

require_backup_env BACKUP_SOURCE_PROJECT_REF
require_backup_env RESTORE_PROJECT_REF
require_backup_env RESTORE_DB_URL
if [[ "$RESTORE_PROJECT_REF" == "$BACKUP_SOURCE_PROJECT_REF" ]]; then
  backup_die "RESTORE_PROJECT_REF must differ from the backup source project"
fi

require_backup_env RESTORE_S3_ACCESS_KEY_ID
require_backup_env RESTORE_S3_SECRET_ACCESS_KEY
require_backup_env RESTIC_REPOSITORY
require_backup_env RESTIC_PASSWORD
if [[ "$RESTIC_REPOSITORY" == s3:* ]]; then
  require_backup_env AWS_ACCESS_KEY_ID
  require_backup_env AWS_SECRET_ACCESS_KEY
fi

for command_name in node rclone restic psql; do
  require_backup_command "$command_name"
done
require_supabase_db_url_matches_project_ref RESTORE_DB_URL RESTORE_PROJECT_REF

umask 077
WORK_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/fitcheck-restore.XXXXXX")"
RESTORE_ROOT="$WORK_ROOT/snapshot"
cleanup() {
  rm -rf "$WORK_ROOT"
}
trap cleanup EXIT INT TERM
mkdir -p "$RESTORE_ROOT" "$WORK_ROOT/restic-cache"
export RESTIC_CACHE_DIR="$WORK_ROOT/restic-cache"

printf 'Restoring encrypted snapshot into an isolated temporary directory…\n'
restic restore "$SNAPSHOT_ID" --target "$RESTORE_ROOT" --no-lock
node "$SCRIPT_DIR/manifest.mjs" validate --root "$RESTORE_ROOT" >/dev/null

MANIFEST_SOURCE_REF="$(
  node -e '
    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (typeof manifest.projectRef !== "string" || !manifest.projectRef) process.exit(1);
    process.stdout.write(manifest.projectRef);
  ' "$RESTORE_ROOT/manifest.json"
)"
if [[ "$MANIFEST_SOURCE_REF" != "$BACKUP_SOURCE_PROJECT_REF" ]]; then
  backup_die "snapshot source project does not match BACKUP_SOURCE_PROJECT_REF"
fi
if [[ "$MANIFEST_SOURCE_REF" == "$RESTORE_PROJECT_REF" ]]; then
  backup_die "snapshot source and restore target must be different projects"
fi

printf 'Restoring database into the confirmed disposable project…\n'
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$RESTORE_ROOT/database/roles.sql" \
  --file "$RESTORE_ROOT/database/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$RESTORE_ROOT/database/data.sql" \
  --dbname "$RESTORE_DB_URL"

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "$RESTORE_ROOT/database/migration-history-schema.sql" \
  --file "$RESTORE_ROOT/database/migration-history-data.sql" \
  --dbname "$RESTORE_DB_URL"

export RCLONE_CONFIG_RESTORE_TYPE=s3
export RCLONE_CONFIG_RESTORE_PROVIDER=Other
export RCLONE_CONFIG_RESTORE_ACCESS_KEY_ID="$RESTORE_S3_ACCESS_KEY_ID"
export RCLONE_CONFIG_RESTORE_SECRET_ACCESS_KEY="$RESTORE_S3_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_RESTORE_ENDPOINT="https://${RESTORE_PROJECT_REF}.storage.supabase.co/storage/v1/s3"
export RCLONE_CONFIG_RESTORE_ACL=private
export RCLONE_CONFIG_RESTORE_NO_CHECK_BUCKET=true

printf 'Uploading wardrobe objects to the disposable project…\n'
rclone copy "$RESTORE_ROOT/storage/wardrobe" "restore:wardrobe" \
  --fast-list --checkers 8 --transfers 4 --stats-one-line --stats 1m
rclone check "$RESTORE_ROOT/storage/wardrobe" "restore:wardrobe" \
  --one-way --size-only
rclone size "restore:wardrobe" --json > "$WORK_ROOT/restored-storage-stats.json"
node "$SCRIPT_DIR/manifest.mjs" compare-storage \
  --root "$RESTORE_ROOT" \
  --storage-stats "$WORK_ROOT/restored-storage-stats.json" >/dev/null

cat <<'CHECKLIST'
Snapshot bytes and database dumps restored successfully.

The disposable-project drill is not complete until the operator verifies:
  1. custom auth/storage policies and triggers against tracked migrations;
  2. Realtime publications required by the app;
  3. sign-in with the dedicated test user;
  4. one private signed wardrobe image;
  5. closet loading and one generated look;
  6. every deletion request newer than the snapshot has been replayed.

Never reopen a disaster-restored production project before step 6.
CHECKLIST
