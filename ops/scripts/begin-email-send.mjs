import fs from "node:fs";
import path from "node:path";
import { loadIssue, readJson, ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issue = loadIssue(date);
const subject = issue.displayDate.startsWith("Sunday")
  ? `Studying the Masters - Sunday - ${issue.displayDate.replace(/^Sunday, /, "")}`
  : `Studying the Masters - ${issue.displayDate.replace(/^[A-Za-z]+, /, "")}`;
const lockPath = path.join(ROOT, `ops/state/${date}-email.lock`);
const readyPath = `ops/state/${date}-publish-ready.json`;
const staleAfterMinutes = Number(process.env.EMAIL_LOCK_STALE_AFTER_MINUTES || 20);
fs.mkdirSync(path.dirname(lockPath), { recursive: true });

function nowIST() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
}

function minutesSinceIST(value) {
  const match = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  if (!match) return Infinity;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const then = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const nowParts = nowIST().match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  const now = Date.UTC(Number(nowParts[1]), Number(nowParts[2]) - 1, Number(nowParts[3]), Number(nowParts[4]), Number(nowParts[5]), Number(nowParts[6] || 0));
  return Math.floor((now - then) / 60000);
}

if (!fs.existsSync(path.join(ROOT, readyPath))) {
  throw new Error(`Missing publish-ready receipt: ${readyPath}`);
}

const ready = readJson(readyPath);
if (ready.date !== date) {
  throw new Error(`Publish-ready receipt date ${ready.date} does not match ${date}`);
}
if (ready.status !== "live_verified_email_pending") {
  throw new Error(`Publish-ready receipt is not email pending: ${ready.status}`);
}
if (ready.email_subject !== subject) {
  throw new Error(`Publish-ready email subject does not match issue subject: ${ready.email_subject}`);
}
if (ready.email_lock !== `ops/state/${date}-email.lock`) {
  throw new Error(`Publish-ready email lock path does not match ${date}`);
}

const lock = {
  date,
  subject,
  status: "sending",
  attempt: 1,
  created_at_ist: nowIST(),
  updated_at_ist: nowIST()
};

try {
  const fd = fs.openSync(lockPath, "wx");
  fs.writeFileSync(fd, JSON.stringify(lock, null, 2));
  fs.closeSync(fd);
  console.log(`EMAIL_LOCK_ACQUIRED ${lockPath}`);
} catch (error) {
  if (error.code === "EEXIST") {
    const existing = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (existing.status === "sent") {
      console.error(`EMAIL_ALREADY_SENT ${lockPath}`);
      process.exit(2);
    }
    const canRecoverFailed = ["failed_send", "stale_sending"].includes(existing.status);
    const canRecoverStale = existing.status === "sending" && minutesSinceIST(existing.updated_at_ist || existing.created_at_ist) >= staleAfterMinutes;
    if (canRecoverFailed || canRecoverStale) {
      const recovered = {
        ...existing,
        status: "sending",
        attempt: Number(existing.attempt || 1) + 1,
        previous_status: existing.status,
        updated_at_ist: nowIST()
      };
      fs.writeFileSync(lockPath, JSON.stringify(recovered, null, 2));
      console.log(`EMAIL_LOCK_RECOVERED ${lockPath}`);
      process.exit(0);
    }
    console.error(`EMAIL_LOCK_EXISTS ${lockPath}`);
    process.exit(3);
  }
  throw error;
}
