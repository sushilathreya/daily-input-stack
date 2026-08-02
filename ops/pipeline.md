# Studying the Masters Pipeline

This system is a staged publication pipeline. No single automation owns the full issue.

## Daily State

Each issue uses this date key:

`YYYY-MM-DD`

Each stage writes a receipt into `ops/state/`:

- `YYYY-MM-DD-weekly-program.json`
- `YYYY-MM-DD-canon-prep.json`
- `YYYY-MM-DD-morning-signals.json`
- `YYYY-MM-DD-publish-receipt.json`
- `YYYY-MM-DD-watchdog.json`
- `YYYY-MM-DD-email.lock`

## Stage Rules

### Weekly Program

Runs Sunday. Chooses the coming week's canon program only. It does not publish, push, or email.

Output: weekly program receipt.

### Canon Prep

Runs at 10 PM the night before the issue. Builds the next issue locally only.

Allowed:

- edit `index.html`
- edit `styles.css` only for necessary layout fixes
- read local books
- add source-access links
- write the canon prep receipt

Forbidden:

- push to GitHub
- send email
- browse X/Twitter
- do morning field-note research

Before self-assigning a canon reading, check prior issues and receipts. Do not repeat a masterwork chapter that has already been studied unless the user explicitly asks for a reread.

Canon prep must assign one bounded reading. Prefer one chapter or a clearly named section under 60 pages. If a source chapter is longer than 60 pages, assign a smaller page range with an explicit stop point. Never bundle multiple chapters or an entire book part into a daily reading.

For PDF sources, run a parser preflight before assigning the reading. Use `pdf-inspector` when available to classify text-based, scanned, image-based, or mixed PDFs and extract Markdown for native-text pages. If the PDF is scanned or mixed, do not trust empty text extraction; use OCR, rendered page inspection, or a verified table of contents/page range before writing the canon assignment.

### Morning Signals

Runs at 9 AM on the delivery day.

Budget:

- 10 minutes for field-note source scan
- exactly 10 minutes for X/Twitter sampling
- remaining time only for integrating concise signals into the local page

Allowed:

- update field notes
- update X fragments
- write morning signals receipt

Forbidden:

- rewriting the canon from scratch
- open-ended research
- pushing to GitHub
- sending email
- mutating X/Twitter in any way

The morning signals stage must not leave yesterday's field notes or X fragments on a new issue. It has three valid outcomes:

- add fresh field notes and write `status: morning_signals_added`
- add a visible "No fresh signals today" note and write `status: no_fresh_signals`
- write `status: blocked` before publication begins

If `status: blocked`, the publisher must not publish stale field notes or stale X fragments as if they belong to today's issue.

### Publisher And Delivery

Runs after the morning signals stage.

Allowed:

- verify required receipts
- verify local page date and title
- verify field notes and X fragments are fresh for today's issue, or visibly marked as no fresh signals
- run local static checks
- commit and push
- wait for GitHub Pages
- curl the live page
- send success email only after live verification
- write publish receipt

Before sending a success email, acquire the local delivery lock by creating `ops/state/YYYY-MM-DD-email.lock`, then search Sent Gmail for the exact subject. If a matching success email already exists, do not send another. If the lock already exists, do not send; update the receipt from the existing delivery state instead.

Forbidden:

- broad editorial rewriting
- new field-note research
- X/Twitter browsing
- sending success email before live verification

### Rescue Watchdog

Runs before the inbox deadline.

Checks:

- live page contains today's date
- live page contains today's issue title
- publish receipt exists
- success email was sent or publisher final confirms it

If any check fails, first try to recover delivery:

- verify the best available local issue
- if signals are blocked or stale, add a visible no-fresh-signals note or perform a bounded signal rescue before publishing
- commit and push if needed
- wait briefly for GitHub Pages
- curl the live page with a cache-busting query string
- acquire `ops/state/YYYY-MM-DD-email.lock`, search Sent Gmail for the exact subject, then send the success email only if no success email already exists
- write the publish receipt if recovery succeeds

Only send a delivery issue email if recovery is not possible before the inbox deadline. Failure notice is the last resort, not the primary job.

## Quality Bar

The page is a magazine, not a dashboard. The canon is source-first. The field notes must be timely, sourced, and varied. X fragments must be high-signal or omitted.
