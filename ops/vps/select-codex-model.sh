#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
NODE_BIN="/home/sushil/.nvm/versions/node/v22.22.0/bin"
CODEX="$NODE_BIN/codex"
LOG_DIR="$BASE/logs"

mkdir -p "$LOG_DIR"
export PATH="$NODE_BIN:$PATH"

requested="${STM_CODEX_MODEL:-}"
models=()
if [[ -n "$requested" ]]; then
  models+=("$requested")
fi
models+=("gpt-5.6-luna" "gpt-5.6-terra" "gpt-6-astra")

probe() {
  local model="$1"
  local slug="${model//[^[:alnum:]]/-}"
  local output
  output="$(timeout 45s "$CODEX" exec -m "$model" -C "$REPO" -s read-only -c approval_policy='"never"' 'Reply with CODEX_READY only.' 2>&1 || true)"
  printf '%s\n' "$output" > "$LOG_DIR/codex-preflight-$slug.log"
  printf '%s\n' "$output" | grep -qx 'CODEX_READY'
}

declare -A seen=()
for model in "${models[@]}"; do
  [[ -n "${seen[$model]:-}" ]] && continue
  seen[$model]=1
  if probe "$model"; then
    printf '%s\n' "$model"
    exit 0
  fi
done

# A stale CLI is a recoverable infrastructure problem. Upgrade it once, then
# retry the known-good model list before allowing the scheduled job to stop.
npm install -g @openai/codex@latest > "$LOG_DIR/codex-upgrade.log" 2>&1 || true
for model in "gpt-5.6-luna" "gpt-5.6-terra" "gpt-6-astra"; do
  if probe "$model"; then
    printf '%s\n' "$model"
    exit 0
  fi
done

echo "No supported Codex model passed preflight" >&2
exit 1
