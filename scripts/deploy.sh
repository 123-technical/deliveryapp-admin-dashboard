#!/usr/bin/env bash
set -Eeuo pipefail

# Optional local configuration file. Keep credentials and host details out of git.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG_FILE:-$SCRIPT_DIR/.env.deploy.local}"
if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

: "${DEPLOY_HOST:?Set DEPLOY_HOST, for example admin.example.com}"
: "${DEPLOY_USER:?Set DEPLOY_USER, for example deploy}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH, for example /var/www/admin-dashboard}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_KEY="${DEPLOY_KEY:-}"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_ARGS=(-p "$DEPLOY_PORT")
RSYNC_ARGS=(-e "ssh -p $DEPLOY_PORT")

if [[ -n "$DEPLOY_KEY" ]]; then
  if [[ ! -r "$DEPLOY_KEY" ]]; then
    echo "SSH key is not readable: $DEPLOY_KEY" >&2
    exit 1
  fi
  SSH_ARGS+=(-i "$DEPLOY_KEY")
  RSYNC_ARGS=(-e "ssh -p $DEPLOY_PORT -i $DEPLOY_KEY")
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
command -v ssh >/dev/null || { echo "ssh is required" >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 1; }

if [[ ! -f package-lock.json && ! -f npm-shrinkwrap.json ]]; then
  echo "No package-lock.json found; using npm run build without dependency installation." >&2
fi

npm run build

if [[ ! -d dist ]]; then
  echo "Build completed but dist/ was not created" >&2
  exit 1
fi

echo "Preparing ${REMOTE}:${DEPLOY_PATH}"
ssh "${SSH_ARGS[@]}" "$REMOTE" "mkdir -p '$DEPLOY_PATH'"

echo "Uploading dist/"
rsync -az --delete "${RSYNC_ARGS[@]}" dist/ "$REMOTE:$DEPLOY_PATH/"

echo "Deployment complete: ${DEPLOY_HOST}"
