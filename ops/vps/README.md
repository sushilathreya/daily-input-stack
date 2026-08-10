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

## Cron

Install with:

```sh
crontab ops/vps/crontab
```

The runner uses `flock`, so overlapping runs do not compete.
