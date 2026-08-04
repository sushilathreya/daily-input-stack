import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildIssueHtml } from "./render-lib.mjs";
import { escapeHtml, inline, loadIssue, readJson, ROOT, writeFile } from "./lib.mjs";

const includeDate = process.argv[2] || "";

const legacyEditions = [
  {
    date: "2026-07-30",
    issueNumber: 1,
    displayDate: "Thursday, 30 July 2026",
    title: "Advertising stops being a gamble.",
    author: "Claude Hopkins",
    work: "Scientific Advertising",
    chapter: "Just Salesmanship",
    field: "advertising / salesmanship",
    study: "Scientific Advertising",
    snapshotCommit: "835b110c31d8bc03edce235d71beb99bc84d8c0a"
  },
  {
    date: "2026-07-31",
    issueNumber: 2,
    displayDate: "Friday, 31 July 2026",
    title: "You do not create the desire.",
    author: "Eugene Schwartz",
    work: "Breakthrough Advertising",
    chapter: "Mass Desire",
    field: "human desire / persuasion fundamentals",
    study: "Breakthrough Advertising",
    snapshotCommit: "c37cb0033340233f1acc96a4e4f036bb42ff1ff2"
  },
  {
    date: "2026-08-01",
    issueNumber: 3,
    displayDate: "Saturday, 1 August 2026",
    title: "The event changes everything.",
    author: "Robert McKee",
    work: "Story",
    chapter: "The Substance of Story",
    field: "storytelling / narrative structure",
    study: "Story",
    snapshotCommit: "03a20d3a922d5bec123f0cc0020b77350c382c26"
  }
];

function ensureDir(relativePath) {
  fs.mkdirSync(path.join(ROOT, relativePath), { recursive: true });
}

function writeLegacyEdition(edition) {
  const html = execFileSync("git", ["show", `${edition.snapshotCommit}:index.html`], {
    cwd: ROOT,
    encoding: "utf8"
  })
    .replace("</head>", `    <base href="../../" />\n    <link rel="canonical" href="https://sushilathreya.github.io/daily-input-stack/editions/${edition.date}/" />\n  </head>`)
    .replace(/(<nav class="topline"[^>]*>)(?!<a class="brand")/, "$1<a class=\"brand\" href=\"../../\">Studying the Masters</a>")
    .replace(/(<nav class="topline"[^>]*>.*?<a[^>]*class="brand"[^>]*>.*?<\/a>)/s, "$1<a href=\"../../archive/\">Archive</a>");
  ensureDir(`editions/${edition.date}`);
  writeFile(`editions/${edition.date}/index.html`, html);
}

function issueDates() {
  return fs.readdirSync(path.join(ROOT, "ops/issues"))
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .map((file) => file.replace(/\.json$/, ""))
    .filter((date) => date === includeDate || fs.existsSync(path.join(ROOT, `ops/state/${date}-publish-receipt.json`)))
    .sort();
}

function manifestCard(date) {
  const issue = loadIssue(date);
  return {
    date,
    issueNumber: issue.issueNumber,
    displayDate: issue.displayDate,
    title: issue.title,
    author: issue.canon.author,
    work: issue.canon.work,
    chapter: issue.canon.chapter,
    field: issue.canon.field,
    study: issue.meta.study,
    href: `../editions/${date}/`,
    sourceHref: issue.canon.source.driveUrl,
    kind: "manifest"
  };
}

function legacyCard(edition) {
  return {
    ...edition,
    href: `../editions/${edition.date}/`,
    sourceHref: "",
    kind: "legacy"
  };
}

for (const edition of legacyEditions) {
  writeLegacyEdition(edition);
}

for (const date of issueDates()) {
  const issue = loadIssue(date);
  ensureDir(`editions/${date}`);
  writeFile(`editions/${date}/index.html`, buildIssueHtml(issue, {
    stylesheetHref: "../../styles.css",
    archiveHref: "../../archive/",
    homeHref: "../../"
  }));
}

const cards = [
  ...legacyEditions.map(legacyCard),
  ...issueDates().map(manifestCard)
].sort((a, b) => a.date.localeCompare(b.date));

const latestDate = cards.at(-1)?.date || "";
ensureDir("archive");
writeFile("archive/index.html", `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Studying the Masters — Canon Archive</title>
    <meta name="description" content="Older Studying the Masters editions organized by canon reading." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,760&family=Inter:wght@400;500;650;750&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../styles.css" />
  </head>
  <body>
    <header class="cover archive-cover">
      <nav class="topline" aria-label="Archive metadata"><a class="brand" href="../">Studying the Masters</a><span>Canon Archive</span><span>${escapeHtml(cards.length)} editions</span></nav>
      <div class="cover-grid" id="top"><section class="cover-story" aria-labelledby="cover-title"><p class="eyebrow">The Canon Shelf</p><h1 id="cover-title">Return to the masters.</h1><p class="dek">Every older edition that can be recovered from the system, organized around the masterwork so you can catch up without digging through old emails.</p><div class="issue-strip"><span>Latest prepared: ${escapeHtml(latestDate)}</span><span>Focus: canon first</span><span>Use: read, revisit, take notes</span></div></section></div>
    </header>
    <main>
      <section class="archive-shell" aria-label="Older editions">
        <p class="label">Older Editions</p>
        <h2>The canon sequence</h2>
        <div class="archive-list">
          ${cards.map((card) => `<article class="archive-card">
            <a href="${escapeHtml(card.href)}">
              <span>Issue ${String(card.issueNumber).padStart(3, "0")} / ${escapeHtml(card.displayDate)}</span>
              <h3>${escapeHtml(card.author)}: ${escapeHtml(card.chapter)}</h3>
              <p>${escapeHtml(card.work)} · ${escapeHtml(card.field)}</p>
              <strong>${escapeHtml(card.title)}</strong>
            </a>
            <div class="archive-actions"><a href="${escapeHtml(card.href)}">Open edition</a>${card.sourceHref ? `<a href="${escapeHtml(card.sourceHref)}">Open source</a>` : ""}</div>
          </article>`).join("\n          ")}
        </div>
      </section>
    </main>
  </body>
</html>
`);

writeFile("archive/editions.json", `${JSON.stringify(cards, null, 2)}\n`);
console.log(`Rendered archive with ${cards.length} editions`);
