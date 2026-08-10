#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
ENV_FILE="$BASE/.env"
LOCK_FILE="$BASE/weekly-program.lock"
NODE_BIN="/home/sushil/.nvm/versions/node/v22.22.0/bin"
CODEX="$NODE_BIN/codex"

mkdir -p "$BASE/logs"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export PATH="$NODE_BIN:$PATH"

DATE="$("$NODE_BIN/node" -e 'console.log(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));')"

cd "$REPO"

exec flock -n "$LOCK_FILE" timeout 35m "$CODEX" exec \
  -m gpt-5.4 \
  -C "$REPO" \
  -s workspace-write \
  -c approval_policy='"never"' \
  --output-last-message "$BASE/logs/weekly-program-$DATE.last.txt" \
  - < "$REPO/ops/vps/weekly-program-prompt.md"
