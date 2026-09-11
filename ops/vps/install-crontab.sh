#!/usr/bin/env bash
set -euo pipefail

BASE="/home/sushil/studying-the-masters"
REPO="$BASE/daily-input-stack"
SCHEDULE="$REPO/ops/vps/studying-the-masters.crontab"
MARKER="# Studying the Masters schedule. Times are UTC; VPS timezone is UTC."

current="$(crontab -l 2>/dev/null || true)"
preserved="$(printf '%s\n' "$current" | awk -v marker="$MARKER" '
  $0 == marker { skip=1; next }
  skip && /^$/ { skip=0; next }
  skip && /^# Studying the Masters schedule/ { next }
  skip && /daily-input-stack\/ops\/vps\/run-(canon-prep|weekly-program|morning-edition|delivery)\.sh/ { next }
  { print }
')"

{
  printf '%s\n' "$preserved"
  cat "$SCHEDULE"
} | crontab -

echo "Installed Studying the Masters schedule"
crontab -l
