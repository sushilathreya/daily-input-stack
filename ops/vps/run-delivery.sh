#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
ENV_FILE="$BASE/.env"
LOCK_FILE="$BASE/delivery.lock"
NODE="/home/sushil/.nvm/versions/node/v22.22.0/bin/node"

mkdir -p "$BASE/logs"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "$(date -Is) missing env file: $ENV_FILE" >&2
  exit 1
fi

cd "$REPO"
export STM_BOOKS_DIR="$BASE/Books"
exec flock -n "$LOCK_FILE" "$NODE" ops/scripts/vps-deliver.mjs
