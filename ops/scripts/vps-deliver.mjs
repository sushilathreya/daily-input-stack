import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const repo = "https://github.com/sushilathreya/daily-input-stack.git";
const pushRepo = process.env.GITHUB_TOKEN
  ? `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/sushilathreya/daily-input-stack.git`
  : "origin";

function run(command, args, options = {}) {
  return execFileSync(command === "node" ? process.execPath : command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: process.env
  });
}

function istMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

function isSunday(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

const xOptionalCutoff = isSunday(date) ? 11 * 60 + 45 : 9 * 60 + 45;
if (istMinutes() >= xOptionalCutoff) {
  process.env.STM_ALLOW_MISSING_X = "1";
}

function status() {
  return JSON.parse(run("node", ["ops/scripts/delivery-status.mjs", date], { capture: true }));
}

function commitAndPush(message) {
  const changes = run("git", ["status", "--short"], { capture: true }).trim();
  if (!changes) return;
  run("git", ["add", "ops/state", "index.html", "archive", "editions", "ops/canon-history.json"]);
  try {
    run("git", ["diff", "--cached", "--quiet"]);
    return;
  } catch {
    run("git", ["commit", "-m", message]);
    run("git", ["push", pushRepo, "main"]);
  }
}

function fail(reason) {
  console.error(`DELIVERY_BLOCKED ${reason}`);
  try {
    run("node", ["ops/scripts/send-email-resend.mjs", date, "alert", reason]);
  } catch (error) {
    console.error(`ALERT_FAILED ${error.message}`);
  }
  process.exit(1);
}

try {
  run("git", ["fetch", "origin", "main"]);
  run("git", ["checkout", "main"]);
  run("git", ["pull", "--ff-only", repo, "main"]);

  let current = status();
  if (current.status === "sent") {
    console.log(`DELIVERY_ALREADY_SENT ${date}`);
    process.exit(0);
  }

  if (current.status === "valid_not_published") {
    run("node", ["ops/scripts/publish-issue.mjs", date]);
    commitAndPush(`Publish Studying the Masters issue for ${date}`);
    current = status();
  }

  if (current.status !== "ready_to_send") {
    fail(`${current.status}: ${current.reason || current.action || "issue is not ready to send"}`);
  }

  try {
    run("node", ["ops/scripts/begin-email-send.mjs", date]);
  } catch (error) {
    const output = `${error.stdout || ""}${error.stderr || ""}`;
    if (output.includes("EMAIL_ALREADY_SENT")) {
      console.log(`DELIVERY_ALREADY_SENT ${date}`);
      process.exit(0);
    }
    throw error;
  }

  const messageId = run("node", ["ops/scripts/send-email-resend.mjs", date, "newsletter"], { capture: true }).trim();
  if (!messageId) throw new Error("Email provider returned an empty message id");

  run("node", ["ops/scripts/record-email-sent.mjs", date, messageId]);
  run("node", ["ops/scripts/finalize-delivery.mjs", date]);
  commitAndPush(`Record Studying the Masters delivery for ${date}`);
  console.log(`DELIVERY_SENT ${date} ${messageId}`);
} catch (error) {
  fail(error.message);
}
