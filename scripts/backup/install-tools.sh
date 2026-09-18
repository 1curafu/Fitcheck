#!/usr/bin/env bash
set -euo pipefail

SUPABASE_VERSION=2.109.1
RESTIC_VERSION=0.19.1
RCLONE_VERSION=1.75.1

# Checksums are copied from each project's official release checksum file.
# Updating a version requires updating its checksum in the same review.
SUPABASE_SHA256=36d87b7fe6b4bcfe89ac47a4354e526cff22480224de426d7b370f6934556976
RESTIC_SHA256=f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c
RCLONE_SHA256=982b5aa772841168f8e380f139e9e787b2a105403e32b94da8676a0e1c0a13ab

INSTALL_DIR="${1:-}"
if [[ -z "$INSTALL_DIR" ]]; then
  printf 'usage: install-tools.sh <install-directory>\n' >&2
  exit 1
fi
if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  printf 'install-tools.sh supports the GitHub Linux amd64 runner only\n' >&2
  exit 1
fi

for command_name in curl sha256sum tar unzip bzip2 install; do
  command -v "$command_name" >/dev/null 2>&1 || {
    printf 'required command %s is not installed\n' "$command_name" >&2
    exit 1
  }
done

WORK_DIR="$(mktemp -d "${RUNNER_TEMP:-/tmp}/fitcheck-backup-tools.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM
mkdir -p "$INSTALL_DIR"

download_verified() {
  local url="$1"
  local output="$2"
  local expected="$3"
  curl --proto '=https' --tlsv1.2 -fsSL "$url" -o "$output"
  printf '%s  %s\n' "$expected" "$output" | sha256sum --check --status
}

SUPABASE_ARCHIVE="$WORK_DIR/supabase.tar.gz"
download_verified \
  "https://github.com/supabase/cli/releases/download/v${SUPABASE_VERSION}/supabase_${SUPABASE_VERSION}_linux_amd64.tar.gz" \
  "$SUPABASE_ARCHIVE" "$SUPABASE_SHA256"
tar -xzf "$SUPABASE_ARCHIVE" -C "$WORK_DIR"
install -m 0755 "$WORK_DIR/supabase" "$INSTALL_DIR/supabase"

RESTIC_ARCHIVE="$WORK_DIR/restic.bz2"
download_verified \
  "https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_linux_amd64.bz2" \
  "$RESTIC_ARCHIVE" "$RESTIC_SHA256"
bzip2 -dc "$RESTIC_ARCHIVE" > "$WORK_DIR/restic"
install -m 0755 "$WORK_DIR/restic" "$INSTALL_DIR/restic"

RCLONE_ARCHIVE="$WORK_DIR/rclone.zip"
download_verified \
  "https://downloads.rclone.org/v${RCLONE_VERSION}/rclone-v${RCLONE_VERSION}-linux-amd64.zip" \
  "$RCLONE_ARCHIVE" "$RCLONE_SHA256"
unzip -q "$RCLONE_ARCHIVE" -d "$WORK_DIR"
install -m 0755 \
  "$WORK_DIR/rclone-v${RCLONE_VERSION}-linux-amd64/rclone" \
  "$INSTALL_DIR/rclone"

"$INSTALL_DIR/supabase" --version
"$INSTALL_DIR/restic" version
"$INSTALL_DIR/rclone" version | head -n 1

