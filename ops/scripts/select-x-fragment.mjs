import fs from "node:fs";
import { issuePath, readJson, todayInIST, writeFile, xCandidatesPath } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issueFile = issuePath(date);
const candidatesFile = xCandidatesPath(date);

function fail(message) {
  console.error(`X_FRAGMENT_SKIPPED ${message}`);
  process.exit(0);
}

function textDateInIST(createdAt) {
  const dateValue = new Date(createdAt);
  if (Number.isNaN(dateValue.getTime())) return date;
  return dateValue.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function asciiRatio(text) {
  if (!text) return 0;
  const ascii = [...text].filter((char) => char.charCodeAt(0) <= 127).length;
  return ascii / [...text].length;
}

function titleFor(tweet) {
  const text = tweet.text.toLowerCase();
  if (/\b(idea|copy cats|copycats|supply|lawyers)\b/.test(text)) return "A market fragment on beating copycats through speed and supply";
  if (/\bstartup|founder|incumbent|traction\b/.test(text)) return "A startup wins when the new physics force a new story";
  if (/\bsell|sales|customer|money|market research\b/.test(text)) return "Selling is the fastest test of whether the market cares";
  if (/\bproduct|feature|workflow|agent|ai\b/.test(text)) return "A product fragment on turning capability into behavior";
  if (/\bbrand|marketing|advertising|positioning|distribution\b/.test(text)) return "A market fragment on earning attention through a sharper frame";
  if (/\bdesign|website|html|interface\b/.test(text)) return "A design fragment on making an idea usable";
  return "A useful fragment from the timeline";
}

function summaryFor(tweet) {
  const text = tweet.text.toLowerCase();
  if (/\b(idea|copy cats|copycats|supply|lawyers)\b/.test(text)) {
    return "This is worth keeping because it reframes imitation as market evidence rather than only a legal threat. The useful lesson is that demand has to be met with speed, volume, and a stronger operating rhythm, not just protected by complaint after the opportunity is visible.";
  }
  if (/\bstartup|founder|incumbent|traction\b/.test(text)) {
    return "This is worth keeping because it treats narrative as part of the operating system, not decoration. A strange technical or market bet has to become desirable before incumbents copy it, and the company has to keep moving fast enough that the story remains attached to real progress.";
  }
  if (/\bsell|sales|customer|money|market research\b/.test(text)) {
    return "This is useful because it collapses a comforting research loop into the market's actual test: will anyone take action? It belongs beside the canon as a reminder that evidence improves a diagnosis only when it changes what you do next.";
  }
  if (/\bproduct|feature|workflow|agent|ai\b/.test(text)) {
    return "This fragment is useful because it names the behavioral question behind a new capability. The important test is not whether the feature is impressive, but whether it changes a repeated workflow enough for the user to adopt it.";
  }
  if (/\bbrand|marketing|advertising|positioning|distribution\b/.test(text)) {
    return "This is worth carrying into the work because it connects message, market, and distribution. A fragment clears the bar when it gives you a reusable way to see why attention moves.";
  }
  if (/\bdesign|website|html|interface\b/.test(text)) {
    return "This is useful because it treats format as a thinking tool. The point is not visual novelty alone, but whether the medium lets an idea become easier to inspect, change, and remember.";
  }
  return "This fragment cleared the daily filter because it offers a portable distinction rather than a throwaway reaction.";
}

function rejectReason(tweet) {
  const text = String(tweet.text || "").trim();
  const lower = text.toLowerCase();
  if (!tweet.id || !text || !tweet.url) return "missing identity/text/url";
  if (text.length < 80) return "too short";
  if (/^rt\s+@/i.test(text)) return "retweet";
  if (asciiRatio(text) < 0.82) return "likely non-english";
  if (/\b(giveaway|airdrop|whitelist|reply below|like and retweet|drop your|what body type|breakups suck|gm\b|dm me|link in bio)\b/i.test(text)) return "engagement bait or slop";
  if (/\b(arsenal|liverpool|madrid|barcelona|messi|mourinho|guardiola|ballon|bundesliga|champions league|premier league|fc27|footballer)\b/i.test(text)) return "sports chatter";
  if (/\b(crypto|token|mexc|binance|airdrop|presale|memecoin)\b/i.test(text)) return "crypto ticker chatter";
  if (/\b(sign up|visit our website|testing it:|free 👇|free below|launching soon)\b/i.test(text)) return "promo";
  if (!/\b(marketing|brand|consumer|psychology|story|narrative|strategy|distribution|product|startup|design|copy|sales|selling|advertising|media|creator|pricing|positioning|business|customer|market|founder|traction|workflow|agent|ai|commerce|startup)\b/i.test(text)) {
    return "not relevant to the study lanes";
  }
  if (!/\b(because|means|if|when|why|only|should|must|the point|by definition|the best|the way|instead|without|reality|lesson|test)\b/i.test(text)) {
    return "no portable claim";
  }
  return "";
}

function selectionScore(tweet) {
  const text = tweet.text.toLowerCase();
  const topicMatches = (text.match(/\b(marketing|brand|consumer|story|narrative|strategy|distribution|product|startup|design|copy|sales|selling|advertising|media|creator|pricing|positioning|business|customer|market|founder|traction|workflow|agent|ai|commerce)\b/g) || []).length;
  const insightMatches = (text.match(/\b(because|means|if|when|why|only|should|must|the point|by definition|instead|without|reality|lesson|test)\b/g) || []).length;
  const metricScore = Math.min(20, Math.log10(1 + Number(tweet.metrics?.likes || 0) + Number(tweet.metrics?.reposts || 0) * 3 + Number(tweet.metrics?.replies || 0) * 2) * 8);
  const lengthScore = tweet.text.length >= 140 && tweet.text.length <= 1400 ? 15 : tweet.text.length > 1400 ? 2 : 0;
  const feedScore = tweet.feed === "following" ? 16 : 8;
  const originalScore = Math.min(12, Number(tweet.score || 0) / 5);
  const promoPenalty = /\b(100 use cases|sponsored|my course|book a call|download|subscribe)\b/i.test(tweet.text) ? 18 : 0;
  return Math.round((feedScore + Math.min(28, topicMatches * 5) + Math.min(20, insightMatches * 4) + metricScore + lengthScore + originalScore - promoPenalty) * 10) / 10;
}

if (!fs.existsSync(issueFile)) fail(`missing issue ${issueFile}`);
if (!fs.existsSync(candidatesFile)) fail(`missing candidate capture ${candidatesFile}`);

const issue = readJson(issueFile);
if (issue.signals?.status !== "morning_signals_added") fail("signals are not ready");
if (!Array.isArray(issue.signals.fieldNotes) || issue.signals.fieldNotes.length < 3) fail("field notes are not ready");
if (Array.isArray(issue.signals.tweets) && issue.signals.tweets.length > 0) {
  console.log("X_FRAGMENT_ALREADY_PRESENT");
  process.exit(0);
}

const capture = readJson(candidatesFile);
if (capture.date !== date || capture.readonlyOnly !== true) fail("candidate capture is not same-day read-only");

const ranked = (capture.candidates || [])
  .map((tweet) => ({ ...tweet, rejectReason: rejectReason(tweet) }))
  .filter((tweet) => !tweet.rejectReason)
  .map((tweet) => ({ ...tweet, selectionScore: selectionScore(tweet) }))
  .sort((a, b) => b.selectionScore - a.selectionScore);

const selected = ranked[0];
if (!selected || selected.selectionScore < 45) {
  fail(`no candidate cleared quality threshold; best=${selected?.selectionScore || 0}`);
}

issue.signals.tweetHeading = "One fragment from the timeline worth carrying into the work.";
issue.signals.tweets = [{
  collectedAt: date,
  sourceDate: textDateInIST(selected.createdAt),
  feed: selected.feed,
  author: selected.author,
  handle: selected.handle,
  title: titleFor(selected),
  summary: summaryFor(selected),
  text: selected.text,
  url: selected.url
}];
delete issue.signals.tweetNote;

writeFile(issueFile, `${JSON.stringify(issue, null, 2)}\n`);
writeFile(`ops/state/${date}-x-selection.json`, `${JSON.stringify({
  date,
  status: "selected",
  url: selected.url,
  author: selected.author,
  handle: selected.handle,
  feed: selected.feed,
  score: selected.selectionScore,
  candidates_considered: capture.candidates?.length || 0,
  candidates_after_hard_filters: ranked.length,
  created_at_ist: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
}, null, 2)}\n`);

console.log(`X_FRAGMENT_SELECTED ${selected.selectionScore} ${selected.author} ${selected.url}`);
