# Studying the Masters VPS Runner

The VPS runner is the production delivery path. It does not rely on Codex desktop tasks, a sleeping laptop, or a browser Gmail session.

## Runtime

Repository path on the VPS:

`/home/sushil/studying-the-masters/daily-input-stack`

Main command:

`./ops/vps/run-delivery.sh`

The command:

1. pulls latest `main`
2. checks today's delivery status
3. publishes if the issue is valid but not live
4. sends the newsletter through Resend if ready
5. records and finalizes the send
6. commits and pushes the delivery receipt
7. sends an alert email if the newsletter cannot be sent

## Required Secrets

Create `/home/sushil/studying-the-masters/.env` on the VPS:

```sh
GITHUB_TOKEN=""
RESEND_API_KEY=""
STM_EMAIL_FROM="Studying the Masters <your-verified-sender@example.com>"
STM_EMAIL_TO="stickmansubscriptions@gmail.com"
BIRD_READONLY=/home/sushil/.local/bin/bird-readonly
BIRD_AUTH_TOKEN=""
BIRD_CT0=""
```

`GITHUB_TOKEN` needs push access to `sushilathreya/daily-input-stack`.

`RESEND_API_KEY` needs permission to send from `STM_EMAIL_FROM`.

`BIRD_AUTH_TOKEN` and `BIRD_CT0` are read-only X session cookies used by `/home/sushil/.local/bin/bird-readonly`.

Install the read-only wrapper:

```sh
ops/vps/install-bird-readonly.sh
```

The wrapper blocks common mutating X commands and pins the Node path needed by the pnpm-installed `bird` launcher under cron.

## Canon Prep

Canon prep runs at 10 PM IST:

`./ops/vps/run-canon-prep.sh`

It uses the VPS Codex CLI to prepare tomorrow's canon-only draft. It must pass draft validation and must not publish, push, email, browse X, or add field notes.

Required:

- Codex CLI installed at `/home/sushil/.nvm/versions/node/v22.22.0/bin/codex`
- Fresh Codex login on the VPS
- Books copied to `/home/sushil/studying-the-masters/Books`

If Codex reports `refresh_token_reused`, run `codex logout` and `codex login` on the VPS, then rerun the smoke test:

```sh
PATH=/home/sushil/.nvm/versions/node/v22.22.0/bin:$PATH codex exec -C /home/sushil/studying-the-masters/daily-input-stack -s read-only -c approval_policy='"never"' "Reply with CODEX_READY only."
```

## Cron

Install with:

```sh
crontab ops/vps/crontab
```

The runner uses `flock`, so overlapping runs do not compete.
