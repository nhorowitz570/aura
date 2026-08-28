#!/usr/bin/env bash
# One-time, source-dependent setup for a Cloud Agent environment.
# Installs Node dependencies plus the system tooling needed to run a local
# Supabase stack (Docker + fuse-overlayfs + the Supabase CLI). Idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."

export DEBIAN_FRONTEND=noninteractive

# Node dependencies (lockfile is kept in sync with package.json).
npm ci

# Docker engine + fuse-overlayfs storage driver.
# overlay2 cannot extract images with whiteout files inside the nested-container
# VM, and vfs is too slow for Postgres; fuse-overlayfs handles both correctly.
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker.io fuse-overlayfs
fi

# Supabase CLI (pinned for reproducibility).
SUPABASE_CLI_VERSION="v2.116.0"
if ! command -v supabase >/dev/null 2>&1; then
  curl -fsSL -o /tmp/supabase.deb \
    "https://github.com/supabase/cli/releases/download/${SUPABASE_CLI_VERSION}/supabase_${SUPABASE_CLI_VERSION#v}_linux_amd64.deb"
  sudo dpkg -i /tmp/supabase.deb
  rm -f /tmp/supabase.deb
fi

echo "cloud-agent-install: done"
