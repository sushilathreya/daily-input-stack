#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
ENV_FILE="$BASE/.env"
LOCK_FILE="$BASE/morning-edition.lock"
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
export STM_BOOKS_DIR="$BASE/Books"

DATE="$("$NODE_BIN/node" -e 'console.log(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));')"
PROMPT_FILE="$(mktemp)"
trap 'rm -f "$PROMPT_FILE"' EXIT

sed "s/DATE_PLACEHOLDER/$DATE/g" "$REPO/ops/vps/morning-edition-prompt.md" > "$PROMPT_FILE"

cd "$REPO"

exec flock -n "$LOCK_FILE" timeout 50m "$CODEX" exec \
  -m gpt-5.4 \
  -C "$REPO" \
  -s workspace-write \
  -c approval_policy='"never"' \
  --search \
  --output-last-message "$BASE/logs/morning-edition-$DATE.last.txt" \
  - < "$PROMPT_FILE"
