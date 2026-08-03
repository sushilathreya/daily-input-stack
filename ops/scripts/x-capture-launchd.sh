#!/bin/zsh
set -eu

cd "/Users/sushil/Documents/Operation Alpine Thunder/daily-input-stack-public"
mkdir -p ops/logs

date_key="$(TZ=Asia/Kolkata date +%F)"
echo "[$(TZ=Asia/Kolkata date '+%F %T IST')] starting X candidate capture for ${date_key}"
/opt/homebrew/bin/node ops/scripts/capture-x-candidates.mjs "${date_key}"
echo "[$(TZ=Asia/Kolkata date '+%F %T IST')] finished X candidate capture for ${date_key}"
