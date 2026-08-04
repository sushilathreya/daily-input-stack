import { buildIssueHtml } from "./render-lib.mjs";
import { loadIssue, todayInIST, writeFile } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const issue = loadIssue(date);
writeFile("index.html", buildIssueHtml(issue, { stylesheetHref: "styles.css", archiveHref: "archive/" }));
console.log(`Rendered ${date} to index.html`);
