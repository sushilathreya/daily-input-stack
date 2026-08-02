import { execFileSync } from "node:child_process";
import { issuePath, loadIssue, readJson, ROOT, todayInIST, writeFile } from "./lib.mjs";

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
  run("git", ["add", "index.html", issuePath(date), "ops/canon-history.json", "ops/pipeline.md"]);
  run("git", ["commit", "-m", `Publish Studying the Masters issue for ${date}`]);
  run("git", ["push", "origin", "main"]);
}

const commit = run("git", ["rev-parse", "HEAD"], { capture: true }).trim();
let runId = "";
try {
  const runs = JSON.parse(run("gh", ["run", "list", "--repo", "sushilathreya/daily-input-stack", "--limit", "5", "--json", "databaseId,headSha,status,conclusion"], { capture: true }));
  const match = runs.find((item) => item.headSha === commit) || runs[0];
  if (match?.databaseId) {
    runId = String(match.databaseId);
    run("gh", ["run", "watch", runId, "--repo", "sushilathreya/daily-input-stack", "--exit-status"]);
  }
} catch (error) {
  console.warn(`WARN Could not watch GitHub Pages run: ${error.message}`);
}

const live = run("curl", ["-Ls", `https://sushilathreya.github.io/daily-input-stack/?verify=${Date.now()}`], { capture: true });
if (!live.includes(issue.displayDate) || !live.includes(`Issue ${String(issue.issueNumber).padStart(3, "0")}`)) {
  throw new Error("Live page does not contain expected issue date and issue number");
}

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
