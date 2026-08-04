import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATE = "2099-01-16";
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stm-email-lock-"));

function writeJson(relativePath, value) {
  const fullPath = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function run(script, args = [], env = {}) {
  return spawnSync(process.execPath, [`ops/scripts/${script}`, ...args], {
    cwd: tempRoot,
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
}

function assert(name, condition, output = "") {
  if (!condition) {
    console.error(`FAIL ${name}`);
    console.error(output);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${name}`);
  }
}

function writePublishReady() {
  writeJson(`ops/state/${DATE}-publish-ready.json`, {
    date: DATE,
    status: "live_verified_email_pending",
    git_commit: "fixture-commit",
    github_pages_run_id: "fixture-run",
    live_url: "https://sushilathreya.github.io/daily-input-stack/",
    email_recipient: "stickmansubscriptions@gmail.com",
    email_subject: "Studying the Masters - 16 January 2099",
    email_body: "Today's Studying the Masters issue is live:\n\nhttps://sushilathreya.github.io/daily-input-stack/",
    email_lock: `ops/state/${DATE}-email.lock`,
    next_step: `node ops/scripts/begin-email-send.mjs ${DATE}`,
    created_at_ist: `${DATE} 09:30:00`
  });
}

fs.cpSync(path.join(ROOT, "ops/scripts"), path.join(tempRoot, "ops/scripts"), { recursive: true });
writeJson(`ops/issues/${DATE}.json`, {
  date: DATE,
  displayDate: "Friday, 16 January 2099",
  issueNumber: 1000,
  title: "Email lock fixture"
});

try {
  let result = run("begin-email-send.mjs", [DATE]);
  assert("begin blocks without publish-ready receipt", result.status !== 0 && result.stderr.includes("Missing publish-ready receipt"), result.stderr + result.stdout);

  writePublishReady();

  result = run("begin-email-send.mjs", [DATE]);
  assert("first begin acquires lock", result.status === 0 && result.stdout.includes("EMAIL_LOCK_ACQUIRED"), result.stderr + result.stdout);

  result = run("begin-email-send.mjs", [DATE]);
  assert("active sending lock blocks duplicate send", result.status === 3 && result.stderr.includes("EMAIL_LOCK_EXISTS"), result.stderr + result.stdout);

  result = run("record-email-sent.mjs", [DATE]);
  assert("sent recording requires Gmail message id", result.status !== 0 && result.stderr.includes("Missing Gmail message id"), result.stderr + result.stdout);

  result = run("record-email-failed.mjs", [DATE, "gmail tool failed"]);
  assert("failed send is recorded", result.status === 0 && result.stdout.includes("EMAIL_FAILURE_RECORDED"), result.stderr + result.stdout);

  result = run("record-email-sent.mjs", [DATE, "gmail-message-id"]);
  assert("failed lock cannot be marked sent", result.status !== 0 && result.stderr.includes("Email lock is not in sending state"), result.stderr + result.stdout);

  result = run("begin-email-send.mjs", [DATE]);
  assert("failed send lock can be recovered", result.status === 0 && result.stdout.includes("EMAIL_LOCK_RECOVERED"), result.stderr + result.stdout);

  result = run("record-email-sent.mjs", [DATE, "gmail-message-id"]);
  assert("sent email is recorded", result.status === 0 && result.stdout.includes("EMAIL_SENT_RECORDED"), result.stderr + result.stdout);

  result = run("begin-email-send.mjs", [DATE]);
  assert("sent lock prevents duplicate", result.status === 2 && result.stderr.includes("EMAIL_ALREADY_SENT"), result.stderr + result.stdout);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
