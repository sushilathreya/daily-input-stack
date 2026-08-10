#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
BOOKS="$BASE/Books"
ENV_FILE="$BASE/.env"
LOCK_FILE="$BASE/canon-prep.lock"
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
export STM_BOOKS_DIR="$BOOKS"

DATE="$("$NODE_BIN/node" -e 'const d=new Date(Date.now()+86400000); console.log(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(d));')"
PROMPT_FILE="$(mktemp)"
trap 'rm -f "$PROMPT_FILE"' EXIT

sed "s/DATE_PLACEHOLDER/$DATE/g" "$REPO/ops/vps/canon-prep-prompt.md" > "$PROMPT_FILE"

cd "$REPO"

exec flock -n "$LOCK_FILE" timeout 55m "$CODEX" exec \
  -m gpt-5.4 \
  -C "$REPO" \
  --add-dir "$BOOKS" \
  -s workspace-write \
  -c approval_policy='"never"' \
  --output-last-message "$BASE/logs/canon-prep-$DATE.last.txt" \
  - < "$PROMPT_FILE"
