import fs from "node:fs";
import path from "node:path";
import { ROOT, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const reason = process.argv.slice(3).join(" ") || "unknown send failure";
const lockPath = path.join(ROOT, `ops/state/${date}-email.lock`);

if (!fs.existsSync(lockPath)) {
  throw new Error(`Missing email lock: ${lockPath}`);
}

const now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" });
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
if (lock.status === "sent") {
  console.log(`EMAIL_ALREADY_SENT ${lockPath}`);
  process.exit(0);
}
lock.status = "failed_send";
lock.failure_reason = reason;
lock.failed_at_ist = now;
lock.updated_at_ist = now;
fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
console.log(`EMAIL_FAILURE_RECORDED ${lockPath}`);
