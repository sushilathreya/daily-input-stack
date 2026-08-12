import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { escapeHtml, issuePath, loadIssue, readJson, ROOT, todayInIST, writeFile, xCandidatesPath } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issue = loadIssue(date);
const pushRepo = process.env.GITHUB_TOKEN
  ? `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/sushilathreya/daily-input-stack.git`
  : "origin";
const subject = issue.displayDate.startsWith("Sunday")
  ? `Studying the Masters - Sunday - ${issue.displayDate.replace(/^Sunday, /, "")}`
  : `Studying the Masters - ${issue.displayDate.replace(/^[A-Za-z]+, /, "")}`;
const body = `Today's Studying the Masters issue is live:\n\nhttps://sushilathreya.github.io/daily-input-stack/`;

function run(command, args, options = {}) {
  return execFileSync(command === "node" ? process.execPath : command, args, {
    cwd: ROOT,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8"
  });
}

function commandExists(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], {
      cwd: ROOT,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}

function waitForPagesRun(commit) {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = JSON.parse(run("gh", ["run", "list", "--repo", "sushilathreya/daily-input-stack", "--limit", "10", "--json", "databaseId,headSha,status,conclusion"], { capture: true }));
    const match = runs.find((item) => item.headSha === commit);
    if (match?.databaseId) return String(match.databaseId);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
  }
  throw new Error(`No GitHub Pages run appeared for commit ${commit}`);
}

function waitForLiveIssue() {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const live = run("curl", ["-Ls", `https://sushilathreya.github.io/daily-input-stack/?verify=${Date.now()}`], { capture: true });
    try {
      verifyIssueHtml(live, "live page");
      return;
    } catch {
      // Keep polling until the current issue is fully visible on GitHub Pages.
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000);
  }
  throw new Error("Live page does not contain the complete expected issue after waiting");
}

function expectedHtmlSnippets() {
  const snippets = [
    `Issue ${String(issue.issueNumber).padStart(3, "0")}`,
    escapeHtml(issue.displayDate),
    escapeHtml(issue.title),
    escapeHtml(issue.canon.heading),
    escapeHtml(issue.principle.heading),
    escapeHtml(issue.output.heading)
  ];
  for (const note of issue.signals.fieldNotes || []) {
    snippets.push(escapeHtml(note.title));
    snippets.push(escapeHtml(note.source));
  }
  for (const tweet of issue.signals.tweets || []) {
    snippets.push(escapeHtml(tweet.title));
    snippets.push(escapeHtml(tweet.url));
  }
  return snippets;
}

function verifyIssueHtml(html, label) {
  for (const snippet of expectedHtmlSnippets()) {
    if (!html.includes(snippet)) {
      throw new Error(`${label} is missing expected content: ${snippet}`);
    }
  }
  if (/(^|[>\s])(undefined|null|NaN|\[object Object\])([<\s]|$)/.test(html)) {
    throw new Error(`${label} contains an unresolved placeholder`);
  }
}

run("node", ["ops/scripts/validate-issue.mjs", date]);
run("node", ["ops/scripts/render-issue.mjs", date]);
run("node", ["ops/scripts/render-archive.mjs", date]);
verifyIssueHtml(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), "rendered issue");

const history = readJson("ops/canon-history.json");
if (!history.some((entry) => entry.date === issue.date)) {
  history.push({
    date: issue.date,
    author: issue.canon.author,
    work: issue.canon.work,
    chapter: issue.canon.chapter,
    pages: issue.canon.pages || "",
    note: issue.canon.chapterLabel
  });
  writeFile("ops/canon-history.json", `${JSON.stringify(history, null, 2)}\n`);
}

run("git", ["diff", "--check"]);

const status = run("git", ["status", "--short"], { capture: true }).trim();
if (status) {
  const addPaths = [
    "index.html",
    "archive",
    "editions",
    issuePath(date),
    xCandidatesPath(date),
    `ops/state/${date}-x-selection.json`,
    `ops/state/${date}-canon-prep.json`,
    "ops/canon-history.json",
    "ops/pipeline.md"
  ].filter((item) => fs.existsSync(path.join(ROOT, item)));
  run("git", ["add", ...addPaths]);
  const hasStagedChanges = (() => {
    try {
      run("git", ["diff", "--cached", "--quiet"]);
      return false;
    } catch {
      return true;
    }
  })();
  if (hasStagedChanges) {
    run("git", ["commit", "-m", `Publish Studying the Masters issue for ${date}`]);
    run("git", ["push", pushRepo, "main"]);
  } else {
    console.warn("WARN No publishable staged changes; continuing to live verification");
  }
}

const commit = run("git", ["rev-parse", "HEAD"], { capture: true }).trim();
let runId = "";
if (commandExists("gh")) {
  try {
    runId = waitForPagesRun(commit);
    run("gh", ["run", "watch", runId, "--repo", "sushilathreya/daily-input-stack", "--exit-status"]);
  } catch (error) {
    console.warn(`WARN Could not watch GitHub Pages run: ${error.message}`);
  }
} else {
  console.warn("WARN GitHub CLI not found; relying on live page verification");
}

waitForLiveIssue();

writeFile(`ops/state/${date}-publish-ready.json`, JSON.stringify({
  date,
  status: "live_verified_email_pending",
  git_commit: commit,
  github_pages_run_id: runId,
  live_url: "https://sushilathreya.github.io/daily-input-stack/",
  email_recipient: "stickmansubscriptions@gmail.com",
  email_subject: subject,
  email_body: body,
  email_lock: `ops/state/${date}-email.lock`,
  next_step: `node ops/scripts/begin-email-send.mjs ${date}`,
  created_at_ist: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
}, null, 2));

console.log(`READY_TO_EMAIL ${subject}`);
console.log(body);
