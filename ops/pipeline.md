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

### Publisher And Delivery

Runs after the morning signals stage.

Allowed:

- verify required receipts
- verify local page date and title
- run local static checks
- commit and push
- wait for GitHub Pages
- curl the live page
- send success email only after live verification
- write publish receipt

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
- commit and push if needed
- wait briefly for GitHub Pages
- curl the live page with a cache-busting query string
- send the success email if the live page is current
- write the publish receipt if recovery succeeds

Only send a delivery issue email if recovery is not possible before the inbox deadline. Failure notice is the last resort, not the primary job.

## Quality Bar

The page is a magazine, not a dashboard. The canon is source-first. The field notes must be timely, sourced, and varied. X fragments must be high-signal or omitted.
