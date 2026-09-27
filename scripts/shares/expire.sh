#!/usr/bin/env bash
# Nightly: delete expired and abandoned shares (spec 2026-09-26-share-a-look-design.md §0 A1).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=../backup/common.sh
. "$HERE/../backup/common.sh"

for name in SUPABASE_DB_URL SUPABASE_PROJECT_REF SUPABASE_S3_ACCESS_KEY_ID SUPABASE_S3_SECRET_ACCESS_KEY; do
  require_backup_env "$name"
done
for name in node psql rclone; do
  require_backup_command "$name"
done

# A local-only override lets the integration check use Supabase's local S3
# endpoint. Both endpoints must be loopback, so it cannot redirect a production run.
if [[ -n "${SHARE_EXPIRY_LOCAL_S3_ENDPOINT:-}" ]]; then
  node -e '
    const db = new URL(process.env.SUPABASE_DB_URL);
    const s3 = new URL(process.env.SHARE_EXPIRY_LOCAL_S3_ENDPOINT);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (!loopback.has(db.hostname) || !loopback.has(s3.hostname)) process.exit(1);
  ' || backup_die "local S3 override requires loopback DB and endpoint"
else
  require_supabase_db_url_matches_project_ref SUPABASE_DB_URL SUPABASE_PROJECT_REF
fi

umask 077
configure_supabase_rclone
if [[ -n "${SHARE_EXPIRY_LOCAL_S3_ENDPOINT:-}" ]]; then
  export RCLONE_CONFIG_SUPABASE_ENDPOINT="$SHARE_EXPIRY_LOCAL_S3_ENDPOINT"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

psql "$SUPABASE_DB_URL" -Atq -v ON_ERROR_STOP=1 -c "select coalesce(json_agg(json_build_object('token', token, 'ready_at', ready_at, 'created_at', created_at, 'updated_at', updated_at, 'purging_at', purging_at)), '[]') from public.look_shares" > "$WORK/rows.json"
# Supabase's S3 adapter can report an ancient ModTime even for a new object.
# Storage metadata is the authority for the one-day orphan grace; updated_at
# also protects a freshly overwritten image in an older folder.
psql "$SUPABASE_DB_URL" -Atq -v ON_ERROR_STOP=1 -c "select coalesce(json_agg(json_build_object('name', folder, 'modTime', last_write)), '[]') from (select split_part(name, '/', 1) as folder, max(greatest(created_at, updated_at)) as last_write from storage.objects where bucket_id = 'shares' group by 1) s" > "$WORK/folders.json"

node --input-type=module - "$HERE/plan.mjs" "$WORK" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [, , planPath, work] = process.argv;
const { planExpiry } = await import(pathToFileURL(planPath).href);
const rows = JSON.parse(readFileSync(`${work}/rows.json`, 'utf8'));
const folders = JSON.parse(readFileSync(`${work}/folders.json`, 'utf8'))
  .map((f) => ({ name: f.name, modTime: f.modTime }));
const plan = planExpiry({ rows, folders, now: new Date() });
writeFileSync(`${work}/expire.txt`, plan.expire.join('\n'));
writeFileSync(`${work}/orphans.txt`, plan.orphans.join('\n'));
NODE

purge_token_folder() {
  local token="$1"
  # Supabase's S3 endpoint can report success for rclone purge while leaving
  # objects behind. Enumerate exact keys and delete each one instead.
  rclone lsjson --recursive --files-only "supabase:shares/$token" > "$WORK/objects.json"
  node - "$WORK/objects.json" "$WORK/object-names.txt" <<'NODE'
const fs = require('node:fs');
const [source, target] = process.argv.slice(2);
const paths = JSON.parse(fs.readFileSync(source, 'utf8')).map((f) => f.Path);
if (paths.some((p) => typeof p !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(p) ||
    p.split('/').some((s) => !s || s === '.' || s === '..'))) {
  throw new Error('Unexpected share object path');
}
fs.writeFileSync(target, paths.join('\n'));
NODE
  while IFS= read -r object || [[ -n "$object" ]]; do
    [[ -n "$object" ]] || continue
    rclone deletefile "supabase:shares/$token/$object"
  done < "$WORK/object-names.txt"
  rclone lsjson --recursive --files-only "supabase:shares/$token" > "$WORK/remaining.json"
  node - "$WORK/remaining.json" <<'NODE'
const fs = require('node:fs');
if (JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).length) {
  console.error('share images still present for one token; stopping');
  process.exit(1);
}
NODE
}

purged=0
while IFS= read -r token || [[ -n "$token" ]]; do
  [[ -n "$token" ]] || continue
  # Claim only if the row is STILL expired. The UPDATE row lock serializes with a concurrent refresh;
  # purging_at then closes public reads and authenticated uploads before S3 I/O begins.
  claimed="$(
    cat <<'SQL' | psql "$SUPABASE_DB_URL" -Atq -v ON_ERROR_STOP=1 -v token="$token"
with claimed as (
  update public.look_shares
  set purging_at = clock_timestamp()
  where token = :'token' and purging_at is null
    and (ready_at <= now() - interval '30 days'
      or (ready_at is null and updated_at <= now() - interval '1 day'))
  returning token
)
select token from claimed
union all
select token from public.look_shares where token = :'token' and purging_at is not null;
SQL
  )"
  [[ "$claimed" == "$token" ]] || continue
  purge_token_folder "$token"
  # psql interpolates -v variables only in scripts read from stdin, never in -c.
  printf "delete from public.look_shares where token = :'token' and purging_at is not null;\n" |
    psql "$SUPABASE_DB_URL" -Atq -v ON_ERROR_STOP=1 -v token="$token"
  purged=$((purged + 1))
done < "$WORK/expire.txt"

orphans=0
while IFS= read -r token || [[ -n "$token" ]]; do
  [[ -n "$token" ]] || continue
  purge_token_folder "$token"
  orphans=$((orphans + 1))
done < "$WORK/orphans.txt"

echo "Share expiry: ${purged} expired share(s) removed, ${orphans} orphan folder(s) removed."
