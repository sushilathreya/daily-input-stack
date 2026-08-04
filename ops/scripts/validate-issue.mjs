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

function requireUrl(object, key, label = key) {
  requireString(object, key, label);
  if (typeof object?.[key] === "string" && !/^https?:\/\//i.test(object[key])) {
    fail(`${label} must be an http(s) URL`);
  }
}

function checkFreshSourceDate(value, label, maxAgeDays) {
  requireString({ value }, "value", label);
  if (typeof value !== "string" || value.trim() === "") return;
  const age = daysBetween(date, value);
  if (!Number.isFinite(age)) {
    fail(`${label} must be YYYY-MM-DD`);
    return;
  }
  if (age < 0) {
    fail(`${label} is after issue date`);
  } else if (age > maxAgeDays) {
    const message = `${label} is older than ${maxAgeDays} days`;
    if (draft) warn(message);
    else fail(message);
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
  requireString(issue, "eyebrow", "issue.eyebrow");
  requireString(issue, "dek", "issue.dek");
  requireString(issue.meta, "canon", "issue.meta.canon");
  requireString(issue.meta, "study", "issue.meta.study");
  requireString(issue.meta, "practice", "issue.meta.practice");
  requireString(issue.marginNote, "label", "issue.marginNote.label");
  requireString(issue.marginNote, "body", "issue.marginNote.body");

  requireString(issue.canon, "author", "canon.author");
  requireString(issue.canon, "work", "canon.work");
  requireString(issue.canon, "chapter", "canon.chapter");
  requireString(issue.canon, "chapterLabel", "canon.chapterLabel");
  requireString(issue.canon, "heading", "canon.heading");
  requireString(issue.canon, "standfirst", "canon.standfirst");
  requireString(issue.canon, "field", "canon.field");
  requireString(issue.canon, "readerIntro", "canon.readerIntro");
  requireString(issue.canon?.source, "localPath", "canon.source.localPath");
  requireUrl(issue.canon?.source, "driveUrl", "canon.source.driveUrl");
  requireUrl(issue.canon?.source, "booksFolderUrl", "canon.source.booksFolderUrl");
  requireString(issue.canon?.source?.parserPreflight, "status", "canon.source.parserPreflight.status");
  if (!["pdftotext_verified", "rendered_pages_verified", "manual_verified"].includes(issue.canon?.source?.parserPreflight?.status)) {
    fail("canon.source.parserPreflight.status must be a verified status");
  }
  if (issue.canon?.source?.parserPreflight?.tableOfContentsVerified !== true) {
    fail("canon.source.parserPreflight.tableOfContentsVerified must be true");
  }

  if (issue.canon?.pageCount && issue.canon.pageCount > 60 && !issue.canon.stopPoint) {
    fail(`Canon reading is ${issue.canon.pageCount} pages; add a smaller page range or explicit stopPoint`);
  }

  if (issue.canon?.source?.localPath && !fs.existsSync(issue.canon.source.localPath)) {
    fail(`Local source does not exist: ${issue.canon.source.localPath}`);
  }

  if (!Array.isArray(issue.canon?.blocks) || issue.canon.blocks.length === 0) {
    fail("canon.blocks must contain source-led reader blocks");
  } else {
    for (const [index, block] of issue.canon.blocks.entries()) {
      requireString(block, "label", `canon.blocks[${index}].label`);
      if (!Array.isArray(block.paragraphs) || block.paragraphs.length === 0) {
        fail(`canon.blocks[${index}].paragraphs must contain at least 1 paragraph`);
      }
      for (const [paragraphIndex, paragraph] of (block.paragraphs || []).entries()) {
        if (typeof paragraph !== "string" || paragraph.trim() === "") {
          fail(`canon.blocks[${index}].paragraphs[${paragraphIndex}] must be a non-empty string`);
        }
      }
    }
  }
  if (!Array.isArray(issue.canon?.closeReading) || issue.canon.closeReading.length < 3) {
    fail("canon.closeReading must contain at least 3 prompts");
  }
  for (const [index, prompt] of (issue.canon?.closeReading || []).entries()) {
    if (typeof prompt !== "string" || prompt.trim() === "") {
      fail(`canon.closeReading[${index}] must be a non-empty string`);
    }
  }
  for (const [index, anchor] of (issue.canon?.passageAnchors || []).entries()) {
    if (typeof anchor !== "string" || anchor.trim() === "") {
      fail(`canon.passageAnchors[${index}] must be a non-empty string`);
    }
  }

  requireString(issue.principle, "heading", "principle.heading");
  requireString(issue.principle, "body", "principle.body");
  requireString(issue.principle, "exampleLabel", "principle.exampleLabel");
  requireString(issue.principle, "example", "principle.example");
  requireString(issue.principle, "practiceLabel", "principle.practiceLabel");
  requireString(issue.principle, "practice", "principle.practice");
  requireString(issue.output, "heading", "output.heading");
  requireString(issue.output, "body", "output.body");

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
    const capture = fs.existsSync(candidatesPath) ? readJson(xCandidatesPath(date)) : {};
    if (capture.date && capture.date !== issue.date) fail(`X candidate capture date ${capture.date} does not match issue date`);
    if (capture.readonlyOnly !== true) fail("X candidate capture must be readonlyOnly");
    if (typeof capture.capturedAtIST !== "string" || !capture.capturedAtIST.startsWith(issue.date)) {
      fail("X candidate capture must be collected on the issue date");
    }
    const candidateUrls = new Set((capture.candidates || []).map((tweet) => tweet.url));

    for (const [index, item] of (signals.fieldNotes || []).entries()) {
      requireString(item, "title", `signals.fieldNotes[${index}].title`);
      requireString(item, "source", `signals.fieldNotes[${index}].source`);
      requireUrl(item, "url", `signals.fieldNotes[${index}].url`);
      requireString(item, "whatHappened", `signals.fieldNotes[${index}].whatHappened`);
      requireString(item, "whyItMatters", `signals.fieldNotes[${index}].whyItMatters`);
      requireString(item, "watch", `signals.fieldNotes[${index}].watch`);
      requireString(item, "collectedAt", `signals.fieldNotes[${index}].collectedAt`);
      if (item.collectedAt !== issue.date) fail(`field note "${item.title}" collectedAt is not issue date`);
      checkFreshSourceDate(item.sourceDate, `signals.fieldNotes[${index}].sourceDate`, 7);
    }
    for (const [index, tweet] of (signals.tweets || []).entries()) {
      requireString(tweet, "title", `signals.tweets[${index}].title`);
      requireString(tweet, "summary", `signals.tweets[${index}].summary`);
      requireString(tweet, "text", `signals.tweets[${index}].text`);
      requireString(tweet, "author", `signals.tweets[${index}].author`);
      requireUrl(tweet, "url", `signals.tweets[${index}].url`);
      requireString(tweet, "collectedAt", `signals.tweets[${index}].collectedAt`);
      if (tweet.collectedAt !== issue.date) fail(`tweet "${tweet.url}" collectedAt is not issue date`);
      checkFreshSourceDate(tweet.sourceDate, `signals.tweets[${index}].sourceDate`, 1);
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
