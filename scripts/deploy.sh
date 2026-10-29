#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <ssh-key-path> <user@host>" >&2
  exit 1
fi

REMOTE="$1"
SSH_KEY="$2"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$SSH_KEY" != /* ]]; then
  SSH_KEY="$PWD/$SSH_KEY"
fi

if [[ ! -r "$SSH_KEY" ]]; then
  echo "SSH key is not readable: $SSH_KEY" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
pnpm install
npm run build

if [[ ! -d dist ]] || [[ -z "$(find dist -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "Build completed but dist/ is empty or missing" >&2
  exit 1
fi

scp -r -i "$SSH_KEY" ./dist/* "ubuntu@$REMOTE:/var/www/grocery-app/admin/"
