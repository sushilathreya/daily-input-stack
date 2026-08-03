import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { issuePath, loadIssue, nowISTMinutes, readJson, ROOT, scheduleForDate, todayInIST, writeFile, xCandidatesPath } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issue = loadIssue(date);
const subject = issue.displayDate.startsWith("Sunday")
  ? `Studying the Masters - Sunday - ${issue.displayDate.replace(/^Sunday, /, "")}`
  : `Studying the Masters - ${issue.displayDate.replace(/^[A-Za-z]+, /, "")}`;
const body = `Today's Studying the Masters issue is live:\n\nhttps://sushilathreya.github.io/daily-input-stack/`;

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: ROOT,
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8"
  });
}

function assertDeliveryWindow() {
  if (process.env.ALLOW_LATE_DELIVERY === "1") return;
  if (date !== todayInIST()) return;
  const schedule = scheduleForDate(date);
  const now = nowISTMinutes();
  if (now >= schedule.deliveryDeadlineMinutes) {
    throw new Error(`Delivery deadline has passed for ${date}. Refusing to send a late success email. Set ALLOW_LATE_DELIVERY=1 only for an explicit manual rescue.`);
  }
}

function assertMorningSignalsReady() {
  const receiptPath = `ops/state/${date}-morning-signals.json`;
  const absoluteReceiptPath = path.join(ROOT, receiptPath);
  if (!fs.existsSync(absoluteReceiptPath)) {
    throw new Error(`Missing morning signals receipt: ${receiptPath}`);
  }

  const receipt = readJson(receiptPath);
  if (receipt.status !== "morning_signals_added") {
    throw new Error(`Morning signals receipt is ${receipt.status}; refusing to publish a complete issue`);
  }
  if ((receipt.x_fragments?.items_added || 0) < 1) {
    throw new Error("Morning signals selected 0 X fragments; refusing to publish without the required X section");
  }
  if ((issue.signals?.tweets || []).length < 1) {
    throw new Error("Issue manifest has no selected X fragments; refusing to publish");
  }

  const createdMinutes = receipt.created_at_ist?.match(/(\d{2}):(\d{2})/)
    ? Number(receipt.created_at_ist.match(/(\d{2}):(\d{2})/)[1]) * 60 + Number(receipt.created_at_ist.match(/(\d{2}):(\d{2})/)[2])
    : null;
  const schedule = scheduleForDate(date);
  if (createdMinutes === null) {
    throw new Error("Morning signals receipt has no parseable created_at_ist");
  }
  if (createdMinutes > schedule.signalCutoffMinutes && process.env.ALLOW_LATE_DELIVERY !== "1") {
    throw new Error(`Morning signals completed after cutoff (${receipt.created_at_ist}); refusing late delivery`);
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
  const expectedIssue = `Issue ${String(issue.issueNumber).padStart(3, "0")}`;
  while (Date.now() < deadline) {
    const live = run("curl", ["-Ls", `https://sushilathreya.github.io/daily-input-stack/?verify=${Date.now()}`], { capture: true });
    if (live.includes(issue.displayDate) && live.includes(expectedIssue) && live.includes(issue.title)) {
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15000);
  }
  throw new Error("Live page does not contain expected issue date, number, and title after waiting");
}

assertDeliveryWindow();
assertMorningSignalsReady();
run("node", ["ops/scripts/validate-issue.mjs", date]);
run("node", ["ops/scripts/render-issue.mjs", date]);

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
  run("git", ["add", "index.html", issuePath(date), xCandidatesPath(date), `ops/state/${date}-canon-prep.json`, `ops/state/${date}-morning-signals.json`, "ops/canon-history.json", "ops/pipeline.md"]);
  run("git", ["commit", "-m", `Publish Studying the Masters issue for ${date}`]);
  run("git", ["push", "origin", "main"]);
}

const commit = run("git", ["rev-parse", "HEAD"], { capture: true }).trim();
let runId = "";
try {
  runId = waitForPagesRun(commit);
  run("gh", ["run", "watch", runId, "--repo", "sushilathreya/daily-input-stack", "--exit-status"]);
} catch (error) {
  console.warn(`WARN Could not watch GitHub Pages run: ${error.message}`);
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
