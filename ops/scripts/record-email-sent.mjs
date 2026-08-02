import fs from "node:fs";
import path from "node:path";
import { ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const messageId = process.argv[3] || "";
const lockPath = path.join(ROOT, `ops/state/${date}-email.lock`);

if (!fs.existsSync(lockPath)) {
  throw new Error(`Missing email lock: ${lockPath}`);
}

const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
lock.status = "sent";
lock.email_message_id = messageId;
lock.sent_at_ist = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
console.log(`EMAIL_SENT_RECORDED ${lockPath}`);

