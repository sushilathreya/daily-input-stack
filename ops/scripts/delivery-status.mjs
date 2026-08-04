import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { issuePath, loadIssue, readJson, ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issueFile = path.join(ROOT, issuePath(date));
const readyFile = path.join(ROOT, `ops/state/${date}-publish-ready.json`);
const lockFile = path.join(ROOT, `ops/state/${date}-email.lock`);
const receiptFile = path.join(ROOT, `ops/state/${date}-publish-receipt.json`);

function subjectFor(issue) {
  return issue.displayDate.startsWith("Sunday")
    ? `Studying the Masters - Sunday - ${issue.displayDate.replace(/^Sunday, /, "")}`
    : `Studying the Masters - ${issue.displayDate.replace(/^[A-Za-z]+, /, "")}`;
}

function runValidator() {
  try {
    execFileSync(process.execPath, ["ops/scripts/validate-issue.mjs", date], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe"
    });
    return { ok: true, output: "" };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout || ""}${error.stderr || ""}`.trim()
    };
  }
}

function readIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function emit(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

if (!fs.existsSync(issueFile)) {
  emit({
    date,
    status: "needs_issue",
    action: "create_complete_issue_then_publish",
    reason: `Missing ${issuePath(date)}`
  });
  process.exit(0);
}

const issue = loadIssue(date);
const subject = subjectFor(issue);
const lock = readIfExists(lockFile);
const ready = readIfExists(readyFile);
const receipt = readIfExists(receiptFile);

if (lock?.status === "sent" || receipt?.status === "published_and_emailed") {
  emit({
    date,
    status: "sent",
    action: "stop",
    subject,
    gmail_message_id: lock?.email_message_id || receipt?.gmail_message_id || ""
  });
  process.exit(0);
}

const validation = runValidator();
if (!validation.ok) {
  emit({
    date,
    status: "incomplete",
    action: "finish_all_three_sections_then_publish",
    subject,
    validator_output: validation.output
  });
  process.exit(0);
}

if (!ready || ready.status !== "live_verified_email_pending") {
  emit({
    date,
    status: "valid_not_published",
    action: "run_publish_issue_then_send",
    subject,
    command: `node ops/scripts/publish-issue.mjs ${date}`
  });
  process.exit(0);
}

emit({
  date,
  status: "ready_to_send",
  action: "send_email_now",
  subject: ready.email_subject,
  recipient: ready.email_recipient,
  body: ready.email_body,
  begin_lock_command: `node ops/scripts/begin-email-send.mjs ${date}`,
  sent_record_command: `node ops/scripts/record-email-sent.mjs ${date} <gmail-message-id>`,
  failed_record_command: `node ops/scripts/record-email-failed.mjs ${date} <reason>`
});
