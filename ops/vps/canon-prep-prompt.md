You are preparing tomorrow's Studying the Masters canon section on the VPS.

This is a canon-only preparation run.

Hard rules:
- Prepare the issue manifest for DATE_PLACEHOLDER only.
- Canon is mandatory and must be ready the night before delivery.
- Edit the issue manifest in ops/issues/DATE_PLACEHOLDER.json.
- Write or update ops/state/DATE_PLACEHOLDER-canon-prep.json.
- Run draft validation: node ops/scripts/validate-issue.mjs DATE_PLACEHOLDER --draft.
- Do not publish.
- Do not push.
- Do not send email.
- Do not browse X/Twitter.
- Do not add field notes.
- Do not add X fragments.
- Do not hand-edit index.html.

Canon quality:
- Choose one bounded reading from the weekly program if available.
- If there is no weekly program, choose the next best non-repeated canon reading from the established canon history.
- Check ops/canon-history.json before assigning the reading.
- Do not repeat a chapter that has already been studied unless explicitly marked as a reread.
- Prefer one chapter or a clearly named section under 60 pages.
- If a chapter is longer than 60 pages, assign a smaller page range with a clear stop point.
- For PDFs, verify the page range from source material before assigning it.

Source access:
- VPS books are available at /home/sushil/studying-the-masters/Books.
- Use those files for inspection and page-range verification.
- Reader-facing phone links should come from books-drive-links.json when available.
- Reader-facing Mac open commands should keep the established Mac paths under /Users/sushil/Documents/Operation Alpine Thunder/Books.

Stop condition:
- When the manifest and canon-prep receipt exist and draft validation passes, stop.
- Final response should be one short status line with the date, chosen canon, page range, and validation result.
