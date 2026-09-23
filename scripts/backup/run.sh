#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

MODE="${1:-}"
if [[ "$MODE" != "nightly" && "$MODE" != "manual" ]]; then
  backup_die "mode must be nightly or manual"
fi

require_backup_env SUPABASE_DB_URL
require_backup_env SUPABASE_PROJECT_REF
require_backup_env SUPABASE_S3_ACCESS_KEY_ID
require_backup_env SUPABASE_S3_SECRET_ACCESS_KEY
require_backup_env RESTIC_REPOSITORY
require_backup_env RESTIC_PASSWORD

if [[ "$RESTIC_REPOSITORY" == s3:* ]]; then
  require_backup_env AWS_ACCESS_KEY_ID
  require_backup_env AWS_SECRET_ACCESS_KEY
fi

for command_name in node docker supabase rclone restic psql; do
  require_backup_command "$command_name"
done
require_supabase_db_url_matches_project_ref SUPABASE_DB_URL SUPABASE_PROJECT_REF

umask 077
WORK_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/fitcheck-backup.XXXXXX")"
STAGE_ROOT="$WORK_ROOT/stage"
cleanup() {
  rm -rf "$WORK_ROOT"
}
trap cleanup EXIT INT TERM

mkdir -p "$STAGE_ROOT/database" "$STAGE_ROOT/storage/wardrobe" "$WORK_ROOT/restic-cache"
export RESTIC_CACHE_DIR="$WORK_ROOT/restic-cache"
export SUPABASE_TELEMETRY_DISABLED=1
configure_supabase_rclone

# Initialise only a brand-new local SSD repository. An unreadable existing or cloud repository means a wrong
# password, key or path: fail before production is dumped instead of writing a second repository beside it.
if ! restic cat config --no-lock >/dev/null 2>&1; then
  if [[ "$RESTIC_REPOSITORY" == /* && ! -e "$RESTIC_REPOSITORY" ]]; then
    printf 'Initialising new encrypted backup repository…\n'
    restic init
  else
    backup_die "restic repository is unreadable; refusing to initialise over it (see the backup runbook)"
  fi
fi

printf 'Creating Supabase database dumps…\n'
supabase db dump --db-url "$SUPABASE_DB_URL" \
  -f "$STAGE_ROOT/database/roles.sql" --role-only
supabase db dump --db-url "$SUPABASE_DB_URL" \
  -f "$STAGE_ROOT/database/schema.sql"
supabase db dump --db-url "$SUPABASE_DB_URL" \
  -f "$STAGE_ROOT/database/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
supabase db dump --db-url "$SUPABASE_DB_URL" \
  -f "$STAGE_ROOT/database/migration-history-schema.sql" \
  --schema supabase_migrations
supabase db dump --db-url "$SUPABASE_DB_URL" \
  -f "$STAGE_ROOT/database/migration-history-data.sql" \
  --use-copy --data-only --schema supabase_migrations

# `supabase db dump` covers `public` only. Capture Fitcheck's policies and triggers in the `auth` and `storage`
# schemas (the photo access policy, the sign-up trigger) so a restore does not come back without them.
printf 'Capturing auth/storage policies and triggers…\n'
psql "$SUPABASE_DB_URL" -qAt -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/platform-objects.sql" \
  > "$STAGE_ROOT/database/platform-objects.sql"
if ! head -n 1 "$STAGE_ROOT/database/platform-objects.sql" \
  | grep -Eq '^-- fitcheck-platform-objects policies=[0-9]+ triggers=[0-9]+$'; then
  backup_die "platform object capture produced unexpected output"
fi

printf 'Copying private wardrobe objects…\n'
rclone copy "supabase:wardrobe" "$STAGE_ROOT/storage/wardrobe" \
  --fast-list --checkers 8 --transfers 4 --stats-one-line --stats 1m
rclone size "supabase:wardrobe" --json > "$STAGE_ROOT/storage-source-stats.json"

NODE_VERSION="$(node --version)"
SUPABASE_VERSION="$(supabase --version | head -n 1)"
RESTIC_VERSION="$(restic version | head -n 1)"
RCLONE_VERSION="$(rclone version | head -n 1)"
POSTGRES_VERSION="$(psql --version | head -n 1)"
node -e '
  const fs = require("node:fs");
  const [path, node, supabase, restic, rclone, postgres] = process.argv.slice(1);
  fs.writeFileSync(path, JSON.stringify({ node, supabase, restic, rclone, postgres }));
' "$STAGE_ROOT/tool-versions.json" \
  "$NODE_VERSION" "$SUPABASE_VERSION" "$RESTIC_VERSION" "$RCLONE_VERSION" "$POSTGRES_VERSION"

node "$SCRIPT_DIR/manifest.mjs" create \
  --root "$STAGE_ROOT" \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --storage-stats "$STAGE_ROOT/storage-source-stats.json" \
  --tool-versions "$STAGE_ROOT/tool-versions.json" >/dev/null
node "$SCRIPT_DIR/manifest.mjs" validate --root "$STAGE_ROOT" >/dev/null

# These two inputs are represented inside manifest.json; keeping the helper
# files would duplicate them in every snapshot.
rm "$STAGE_ROOT/storage-source-stats.json" "$STAGE_ROOT/tool-versions.json"

printf 'Writing encrypted %s snapshot…\n' "$MODE"
(
  cd "$STAGE_ROOT"
  restic backup . --tag "$MODE" --host fitcheck-production --no-lock
)

SNAPSHOT_JSON="$(restic snapshots --json --no-lock)"
FORGET_IDS="$(printf '%s' "$SNAPSHOT_JSON" | node "$SCRIPT_DIR/retention.mjs")"
if [[ -n "$FORGET_IDS" ]]; then
  forget_args=()
  while IFS= read -r snapshot_id; do
    [[ -n "$snapshot_id" ]] && forget_args+=("$snapshot_id")
  done <<< "$FORGET_IDS"
  if [[ "${#forget_args[@]}" -gt 0 ]]; then
    printf 'Pruning %s expired/redundant snapshot(s)…\n' "${#forget_args[@]}"
    restic forget --no-lock --prune "${forget_args[@]}"
  fi
fi

printf 'Checking repository integrity…\n'
restic check --no-lock --read-data-subset=5%
printf 'Backup completed successfully.\n'
