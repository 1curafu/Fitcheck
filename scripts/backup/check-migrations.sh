#!/usr/bin/env bash
set -euo pipefail

# Fails when production's applied migrations differ from supabase/migrations: a merged migration that was never
# applied (as 20260919090000 was, for three days) or a production change the repository does not record.
# Read-only: one SELECT on supabase_migrations.schema_migrations.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

require_backup_env SUPABASE_DB_URL
require_backup_env SUPABASE_PROJECT_REF
for command_name in node psql; do
  require_backup_command "$command_name"
done
require_supabase_db_url_matches_project_ref SUPABASE_DB_URL SUPABASE_PROJECT_REF

MIGRATIONS_DIR="${MIGRATIONS_DIR:-$SCRIPT_DIR/../../supabase/migrations}"
REMOTE_VERSIONS="$(psql "$SUPABASE_DB_URL" -At -v ON_ERROR_STOP=1 \
  -c "select version from supabase_migrations.schema_migrations order by version")" \
  || backup_die "could not read production's migration history"

printf '%s\n' "$REMOTE_VERSIONS" | node "$SCRIPT_DIR/migration-drift.mjs" "$MIGRATIONS_DIR"
