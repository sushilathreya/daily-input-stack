import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadIssue, readJson, ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const lockPath = `ops/state/${date}-email.lock`;
const readyPath = `ops/state/${date}-publish-ready.json`;
const receiptPath = `ops/state/${date}-publish-receipt.json`;

function readRequired(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing ${relativePath}`);
  return readJson(relativePath);
}

function istNow() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
}

function targetTime(issue) {
  const isSunday = issue.displayDate.startsWith("Sunday");
  return `${date} ${isSunday ? "12:00:00" : "10:00:00"} IST`;
}

function minutesFromTime(value) {
  const match = String(value || "").match(/(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function deliveryStatus(issue, sentAt) {
  const target = issue.displayDate.startsWith("Sunday") ? 12 * 60 : 10 * 60;
  const sent = minutesFromTime(sentAt);
  if (sent === null) return "unknown";
  return sent <= target ? "on_time" : "delayed";
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe"
  }).trim();
}

const issue = loadIssue(date);
const ready = readRequired(readyPath);
const lock = readRequired(lockPath);

if (ready.status !== "live_verified_email_pending") {
  throw new Error(`Publish-ready receipt is not sendable: ${ready.status}`);
}
if (lock.status !== "sent") {
  throw new Error(`Email lock is not sent: ${lock.status}`);
}
if (!lock.email_message_id) {
  throw new Error("Email lock is missing Gmail message id");
}

const sentAt = lock.sent_at_ist || istNow();
const issueNumber = `Issue ${String(issue.issueNumber).padStart(3, "0")}`;
const receipt = {
  date,
  status: "published_and_emailed",
  delivery_status: deliveryStatus(issue, sentAt),
  target_inbox_time_ist: targetTime(issue),
  local_verified: true,
  git_commit: ready.git_commit || run("git", ["rev-parse", "HEAD"]),
  github_pages_run_id: ready.github_pages_run_id || "",
  live_verified: true,
  live_url: ready.live_url,
  live_checks: [issue.displayDate, issueNumber, issue.title],
  email_recipient: ready.email_recipient,
  email_sent: true,
  email_subject: ready.email_subject,
  gmail_message_id: lock.email_message_id,
  completed_at_ist: sentAt.endsWith("IST") ? sentAt : `${sentAt} IST`
};

if (receipt.delivery_status === "delayed") {
  receipt.delay_note = `Complete issue was sent at ${receipt.completed_at_ist}, after the ${targetTime(issue)} target.`;
}

fs.writeFileSync(path.join(ROOT, receiptPath), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`DELIVERY_FINALIZED ${receiptPath}`);
