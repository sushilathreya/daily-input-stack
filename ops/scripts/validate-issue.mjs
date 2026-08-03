import fs from "node:fs";
import path from "node:path";
import { daysBetween, issuePath, loadIssue, normalizeText, readJson, ROOT, todayInIST, xCandidatesPath } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const draft = process.argv.includes("--draft");
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function requireString(object, key, label = key) {
  if (!object || typeof object[key] !== "string" || object[key].trim() === "") {
    fail(`Missing ${label}`);
  }
}

if (!fs.existsSync(path.join(ROOT, issuePath(date)))) {
  fail(`Missing issue manifest: ${issuePath(date)}`);
} else {
  const issue = loadIssue(date);
  if (issue.date !== date) fail(`Manifest date ${issue.date} does not match requested date ${date}`);
  requireString(issue, "title", "issue.title");
  requireString(issue, "displayDate", "issue.displayDate");
  if (!Number.isInteger(issue.issueNumber)) fail("issue.issueNumber must be an integer");

  requireString(issue.canon, "author", "canon.author");
  requireString(issue.canon, "work", "canon.work");
  requireString(issue.canon, "chapter", "canon.chapter");
  requireString(issue.canon, "chapterLabel", "canon.chapterLabel");
  requireString(issue.canon, "heading", "canon.heading");
  requireString(issue.canon, "standfirst", "canon.standfirst");
  requireString(issue.canon?.source, "localPath", "canon.source.localPath");
  requireString(issue.canon?.source, "driveUrl", "canon.source.driveUrl");
  requireString(issue.canon?.source, "booksFolderUrl", "canon.source.booksFolderUrl");
  requireString(issue.canon?.source?.parserPreflight, "status", "canon.source.parserPreflight.status");

  if (issue.canon?.pageCount && issue.canon.pageCount > 60 && !issue.canon.stopPoint) {
    fail(`Canon reading is ${issue.canon.pageCount} pages; add a smaller page range or explicit stopPoint`);
  }

  if (issue.canon?.source?.localPath && !fs.existsSync(issue.canon.source.localPath)) {
    fail(`Local source does not exist: ${issue.canon.source.localPath}`);
  }

  if (!Array.isArray(issue.canon?.blocks) || issue.canon.blocks.length === 0) {
    fail("canon.blocks must contain source-led reader blocks");
  }
  if (!Array.isArray(issue.canon?.closeReading) || issue.canon.closeReading.length < 3) {
    fail("canon.closeReading must contain at least 3 prompts");
  }

  const history = readJson("ops/canon-history.json");
  const canonKey = normalizeText(`${issue.canon.author} ${issue.canon.work} ${issue.canon.chapter}`);
  const repeat = history.find((entry) => {
    if (entry.date === issue.date) return false;
    return normalizeText(`${entry.author} ${entry.work} ${entry.chapter}`) === canonKey;
  });
  if (repeat && issue.canon.allowRepeat !== true) {
    fail(`Canon repeats ${repeat.date}: ${repeat.author}, ${repeat.work}, ${repeat.chapter}`);
  }

  const signals = issue.signals || {};
  if (!["morning_signals_added", "no_fresh_signals"].includes(signals.status)) {
    fail("signals.status must be morning_signals_added or no_fresh_signals");
  }
  if (signals.status === "no_fresh_signals") {
    requireString(signals, "note", "signals.note");
    if (!draft) {
      fail("final issue requires all 3 sections: canon, field notes, and X fragments");
    }
  }
  if (signals.status === "morning_signals_added") {
    if (!Array.isArray(signals.fieldNotes) || signals.fieldNotes.length < 3) {
      fail("fresh signals require at least 3 field notes");
    }
    if (!Array.isArray(signals.tweets) || signals.tweets.length < 1) {
      fail("fresh signals require at least 1 selected X fragment");
    }
    if ((signals.tweets || []).length > 2) {
      fail("fresh signals allow at most 2 selected X fragments");
    }

    const candidatesPath = path.join(ROOT, xCandidatesPath(date));
    if (!fs.existsSync(candidatesPath)) {
      fail(`Missing X candidate capture: ${xCandidatesPath(date)}`);
    }
    const candidateUrls = fs.existsSync(candidatesPath)
      ? new Set((readJson(xCandidatesPath(date)).candidates || []).map((tweet) => tweet.url))
      : new Set();

    for (const [index, item] of (signals.fieldNotes || []).entries()) {
      requireString(item, "title", `signals.fieldNotes[${index}].title`);
      requireString(item, "source", `signals.fieldNotes[${index}].source`);
      requireString(item, "url", `signals.fieldNotes[${index}].url`);
      requireString(item, "collectedAt", `signals.fieldNotes[${index}].collectedAt`);
      if (item.collectedAt !== issue.date) fail(`field note "${item.title}" collectedAt is not issue date`);
      if (item.sourceDate && daysBetween(issue.date, item.sourceDate) > 7) {
        warn(`field note "${item.title}" sourceDate is older than 7 days`);
      }
    }
    for (const [index, tweet] of (signals.tweets || []).entries()) {
      requireString(tweet, "title", `signals.tweets[${index}].title`);
      requireString(tweet, "summary", `signals.tweets[${index}].summary`);
      requireString(tweet, "text", `signals.tweets[${index}].text`);
      requireString(tweet, "author", `signals.tweets[${index}].author`);
      requireString(tweet, "url", `signals.tweets[${index}].url`);
      requireString(tweet, "collectedAt", `signals.tweets[${index}].collectedAt`);
      if (tweet.collectedAt !== issue.date) fail(`tweet "${tweet.url}" collectedAt is not issue date`);
      if (candidateUrls.size > 0 && !candidateUrls.has(tweet.url)) {
        fail(`tweet "${tweet.url}" was not present in today's captured X candidates`);
      }
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log(`OK ${date} issue manifest passed validation`);
