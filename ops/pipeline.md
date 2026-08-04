# Studying the Masters Pipeline

This system is intentionally small: one issue manifest, one morning edition run, one email.

Agents edit the issue manifest. Scripts validate, render, publish, and prepare delivery. Do not hand-edit `index.html` for normal daily production.

## Daily State

Each issue uses this date key:

`YYYY-MM-DD`

Each stage writes a receipt into `ops/state/`:

- `YYYY-MM-DD-weekly-program.json`
- `YYYY-MM-DD-canon-prep.json`
- `YYYY-MM-DD-publish-receipt.json`
- `YYYY-MM-DD-email.lock`

Each issue has one manifest:

- `ops/issues/YYYY-MM-DD.json`

Core commands:

- `node ops/scripts/validate-issue.mjs YYYY-MM-DD`
- `node ops/scripts/validate-issue.mjs YYYY-MM-DD --draft`
- `node ops/scripts/render-issue.mjs YYYY-MM-DD`
- `node ops/scripts/capture-x-candidates.mjs YYYY-MM-DD`
- `node ops/scripts/publish-issue.mjs YYYY-MM-DD`
- `node ops/scripts/delivery-status.mjs YYYY-MM-DD`

The publisher must use these scripts instead of manually editing and publishing `index.html`.

## Stage Rules

### Weekly Program

Runs Sunday. Chooses the coming week's canon program only. It does not publish, push, or email.

Output: weekly program receipt.

### Canon Prep

Runs at 10 PM the night before the issue. Builds the next issue locally only.

Allowed:

- edit `ops/issues/YYYY-MM-DD.json`
- edit `styles.css` only for necessary layout fixes that apply across rendered issues
- read local books
- add source-access links
- write the canon prep receipt

Forbidden:

- push to GitHub
- send email
- browse X/Twitter
- do morning field-note research
- hand-edit `index.html` for normal issue content

Before self-assigning a canon reading, check prior issues and receipts. Do not repeat a masterwork chapter that has already been studied unless the user explicitly asks for a reread.

Canon prep must assign one bounded reading. Prefer one chapter or a clearly named section under 60 pages. If a source chapter is longer than 60 pages, assign a smaller page range with an explicit stop point. Never bundle multiple chapters or an entire book part into a daily reading.

For PDF sources, run a parser preflight before assigning the reading. Use `pdf-inspector` when available to classify text-based, scanned, image-based, or mixed PDFs and extract Markdown for native-text pages. If the PDF is scanned or mixed, do not trust empty text extraction; use OCR, rendered page inspection, or a verified table of contents/page range before writing the canon assignment.

### Morning Edition

Runs early enough to deliver the email at the promised inbox time: 10:00 AM IST Monday-Saturday, 12:00 PM IST Sunday.

It fills the two fresh sections, publishes the page, and sends the email. No separate publisher or watchdog is part of the normal system.

Budget:

- 10-15 minutes for field-note source scan
- 10 minutes for X/Twitter sampling, beginning with `node ops/scripts/capture-x-candidates.mjs YYYY-MM-DD`
- remaining time for integrating concise signals, publishing, verification, and timed email delivery

Allowed:

- update field notes
- update X fragments
- edit `ops/issues/YYYY-MM-DD.json`
- run validator, renderer, publisher, and email lock scripts
- send the daily email exactly once

Forbidden:

- rewriting the canon from scratch
- open-ended research
- mutating X/Twitter in any way
- hand-editing `index.html` for normal issue content

Completion rule: the final issue must contain all three sections.

- canon/masterwork
- 3-5 fresh field notes
- 1-2 embedded X fragments from `ops/raw/YYYY-MM-DD-x-candidates.json`

`node ops/scripts/validate-issue.mjs YYYY-MM-DD` enforces this. Draft canon prep may use `--draft`; delivery may not.

Before sending a success email, run `node ops/scripts/delivery-status.mjs YYYY-MM-DD`. If it says `ready_to_send`, search Sent Gmail for the exact subject, then acquire the local delivery lock with `node ops/scripts/begin-email-send.mjs YYYY-MM-DD` and send immediately. If a matching success email already exists or the lock status is `sent`, do not send another. If Gmail fails after the lock is acquired, immediately record it with `node ops/scripts/record-email-failed.mjs YYYY-MM-DD <reason>`; a later retry may recover only a `failed_send` lock or a stale `sending` lock.

## Quality Bar

The page is a magazine, not a dashboard. The canon is source-first. The field notes must be timely, sourced, and varied. X fragments must be high-signal and present in every complete issue.
