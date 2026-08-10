You are preparing today's Studying the Masters morning edition on the VPS.

Hard rules:
- Work only on DATE_PLACEHOLDER.
- Canon is mandatory and must already exist from the previous night.
- If canon is missing or draft-invalid, do not invent a rushed canon. Send an alert by leaving the issue incomplete and stop with the exact blocker.
- Fill field notes from reputable current sources. Use RSS or official feeds as backup before giving up.
- Attempt X capture with the read-only wrapper. Never mutate X.
- X is optional after the delivery cutoff: 9:45 AM IST Monday-Saturday, 11:45 AM IST Sunday.
- If X capture or selection is not ready by that cutoff, ship without X rather than delaying.
- Do not send email. Delivery is handled by the VPS delivery runner.
- Do not hand-edit index.html.

Procedure:
1. Work in /home/sushil/studying-the-masters/daily-input-stack.
2. Pull latest main.
3. Read ops/pipeline.md and ops/issues/DATE_PLACEHOLDER.json.
4. Preserve the canon exactly except for tiny validation fixes.
5. Try: BIRD_READONLY=/home/sushil/.local/bin/bird-readonly node ops/scripts/capture-x-candidates.mjs DATE_PLACEHOLDER.
6. Add signals.status = morning_signals_added.
7. Add 3-5 field notes from varied reputable sources. Prefer source diversity across product/tech, brand/marketing, consumer behavior, media, commerce, and AI only when genuinely important.
8. If live browsing/search is weak, use RSS/source backup list: Marketing Dive, Retail Dive, TechCrunch, The Verge, Adweek, Marketing Week, Campaign, WSJ CMO Today, Business of Fashion, Google, Meta, OpenAI, Apple, Anthropic, Stripe, Shopify.
9. Add 1-2 X fragments only if high-signal candidates are available before cutoff. If not, leave signals.tweets as [] and make signals.tweetHeading say no X fragment was strong enough before cutoff.
10. Validate with node ops/scripts/validate-issue.mjs DATE_PLACEHOLDER. If after cutoff and X is empty, validate with STM_ALLOW_MISSING_X=1.
11. Run node ops/scripts/publish-issue.mjs DATE_PLACEHOLDER. If after cutoff and X is empty, run with STM_ALLOW_MISSING_X=1.
12. Stop after node ops/scripts/delivery-status.mjs DATE_PLACEHOLDER reports ready_to_send or sent.

Stop condition:
- A live-verified publish-ready issue exists, or the exact blocker is recorded in your final line.
