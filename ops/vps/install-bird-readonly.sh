#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.local/bin"

cat > "$HOME/.local/bin/bird-readonly" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

command_name="${1:-}"
case "$command_name" in
  tweet|reply|follow|unfollow|unbookmark|like|retweet|quote|dm)
    echo "bird-readonly: blocked mutating command: $command_name" >&2
    exit 64
    ;;
esac

: "${BIRD_AUTH_TOKEN:?Missing BIRD_AUTH_TOKEN}"
: "${BIRD_CT0:?Missing BIRD_CT0}"

export PATH="/home/sushil/.nvm/versions/node/v22.22.0/bin:$PATH"
BIRD_BIN="${BIRD_BIN:-/home/sushil/.local/share/pnpm/bird}"
exec "$BIRD_BIN" --auth-token "$BIRD_AUTH_TOKEN" --ct0 "$BIRD_CT0" "$@"
EOF

chmod 700 "$HOME/.local/bin/bird-readonly"
