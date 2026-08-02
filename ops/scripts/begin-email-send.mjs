import fs from "node:fs";
import path from "node:path";
import { loadIssue, ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issue = loadIssue(date);
const subject = issue.displayDate.startsWith("Sunday")
  ? `Studying the Masters - Sunday - ${issue.displayDate.replace(/^Sunday, /, "")}`
  : `Studying the Masters - ${issue.displayDate.replace(/^[A-Za-z]+, /, "")}`;
const lockPath = path.join(ROOT, `ops/state/${date}-email.lock`);

const lock = {
  date,
  subject,
  status: "sending",
  created_at_ist: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
};

try {
  const fd = fs.openSync(lockPath, "wx");
  fs.writeFileSync(fd, JSON.stringify(lock, null, 2));
  fs.closeSync(fd);
  console.log(`EMAIL_LOCK_ACQUIRED ${lockPath}`);
} catch (error) {
  if (error.code === "EEXIST") {
    console.error(`EMAIL_LOCK_EXISTS ${lockPath}`);
    process.exit(2);
  }
  throw error;
}

