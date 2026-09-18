#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

if [[ "$#" -ne 1 ]]; then
  backup_die "usage: local.sh <external-backup-directory>"
fi
if [[ ! -d "$1" ]]; then
  backup_die "external-backup-directory must already exist"
fi

DESTINATION="$(cd "$1" && pwd -P)"
if [[ "$DESTINATION" != /Volumes/* ]]; then
  backup_die "local backups must be stored on an external volume under /Volumes"
fi
SYSTEM_DEVICE="$(df -P / | awk 'END { print $1 }')"
DESTINATION_DEVICE="$(df -P "$DESTINATION" | awk 'END { print $1 }')"
if [[ -z "$DESTINATION_DEVICE" || "$DESTINATION_DEVICE" == "$SYSTEM_DEVICE" ]]; then
  backup_die "local backups must be stored on an external volume, not the system disk"
fi

export RESTIC_REPOSITORY="$DESTINATION/restic"
exec "$SCRIPT_DIR/run.sh" manual
