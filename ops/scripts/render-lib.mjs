import { escapeHtml, inline } from "./lib.mjs";

function sourceActions(source) {
  const command = `open "${source.localPath}"`;
  return `<div class="source-actions" aria-label="Source material access"><a class="source-link primary" href="${escapeHtml(source.driveUrl)}">Read on phone</a><a class="source-link" href="${escapeHtml(source.booksFolderUrl)}">Books folder</a><button type="button" data-copy-command='${escapeHtml(command)}'>Copy open command</button><code>${escapeHtml(source.localPath)}</code><p>Use Read on phone for the Drive copy. On Mac, copy the command and paste it into Terminal; browsers do not open local files directly from this page.</p></div>`;
}

function readerBlocks(blocks) {
  return blocks.map((block) => {
    const paragraphs = block.paragraphs.map((paragraph) => `<p>${inline(paragraph)}</p>`).join("");
    return `<div class="chapter-block"><span>${escapeHtml(block.label)}</span>${paragraphs}</div>`;
  }).join("\n          ");
}

function passageAnchors(anchors) {
  if (!anchors || anchors.length === 0) return "";
  return `<div class="source-passage compact"><span>Passage Anchors</span>${anchors.map((anchor) => `<blockquote>${escapeHtml(anchor)}</blockquote>`).join("")}</div>`;
}

function closeReading(items) {
  return `<div class="close-reading"><h3>Close Reading Sequence</h3><ol>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol></div>`;
}

function signalsSection(issue) {
  const signals = issue.signals;
  if (signals.status === "no_fresh_signals") {
    return `<section class="signals" id="signals"><p class="label">03 / Field Notes</p><h2>${escapeHtml(signals.heading || "No fresh signals today.")}</h2><div class="signal-grid no-fresh-signals"><article><span>${escapeHtml(issue.displayDate)}</span><h3>Canon-only edition.</h3><p>${inline(signals.note)}</p></article></div></section>
        <section class="timeline" id="timeline"><p class="label">04 / Collected Fragments</p><h2>No X fragments today.</h2><div class="fragment-list"><article><span>${escapeHtml(issue.displayDate)}</span><h3>The page stays on the masterwork.</h3><p>${inline(signals.note)}</p></article></div></section>`;
  }

  const notes = signals.fieldNotes.map((item) => `<article><span>${escapeHtml(item.source)} / ${escapeHtml(item.sourceDate)}</span><h3>${escapeHtml(item.title)}</h3><p><strong>What happened:</strong> ${inline(item.whatHappened)} <strong>Why it matters:</strong> ${inline(item.whyItMatters)} <strong>Watch:</strong> ${inline(item.watch)}</p><a href="${escapeHtml(item.url)}">Read source</a></article>`).join("\n          ");
  const tweets = signals.tweets.map((tweet) => `<article><span>${escapeHtml(tweet.author)} / ${escapeHtml(tweet.feed || "X")} / ${escapeHtml(tweet.sourceDate || tweet.collectedAt)}</span><h3>${escapeHtml(tweet.title)}</h3><p>${inline(tweet.summary)}</p><div class="tweet-shell"><blockquote class="twitter-tweet" data-dnt="true"><p lang="en" dir="ltr">${escapeHtml(tweet.text || "")}</p><a href="${escapeHtml(tweet.url)}">Open on X</a></blockquote></div></article>`).join("\n          ");
  return `<section class="signals" id="signals"><p class="label">03 / Field Notes</p><h2>${escapeHtml(signals.heading || "What the field is teaching now.")}</h2><div class="signal-grid">
          ${notes}
        </div></section>
        <section class="timeline" id="timeline"><p class="label">04 / Collected Fragments</p><h2>${escapeHtml(signals.tweetHeading || "Collected fragments.")}</h2><div class="fragment-list">
          ${tweets}
        </div></section>`;
}

export function buildIssueHtml(issue, options = {}) {
  const stylesheetHref = options.stylesheetHref || "styles.css";
  const archiveHref = options.archiveHref || "archive/";
  const homeHref = options.homeHref || "#top";
  const issueNumber = String(issue.issueNumber).padStart(3, "0");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Studying the Masters — ${escapeHtml(issue.displayDate.replace(/^[A-Za-z]+, /, ""))}</title>
    <meta name="description" content="A daily editorial study of masters, fundamentals, current signals, and deliberate practice." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,760&family=Inter:wght@400;500;650;750&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${escapeHtml(stylesheetHref)}" />
  </head>
  <body>
    <header class="cover">
      <nav class="topline" aria-label="Issue metadata"><a class="brand" href="${escapeHtml(homeHref)}">Studying the Masters</a><a href="${escapeHtml(archiveHref)}">Archive</a><span>Issue ${issueNumber}</span><span>${escapeHtml(issue.displayDate)}</span></nav>
      <div class="cover-grid" id="top"><section class="cover-story" aria-labelledby="cover-title"><p class="eyebrow">${escapeHtml(issue.eyebrow)}</p><h1 id="cover-title">${escapeHtml(issue.title)}</h1><p class="dek">${inline(issue.dek)}</p><div class="issue-strip"><span>Canon: ${inline(issue.meta.canon)}</span><span>Study: ${escapeHtml(issue.meta.study)}</span><span>Practice: ${escapeHtml(issue.meta.practice)}</span></div></section></div>
    </header>
    <main>
      <section class="issue-map" aria-label="Issue contents"><a href="#masterwork">Canon</a><a href="#drill">Principle</a><a href="#signals">Field Notes</a><a href="#timeline">Fragments</a><a href="#output">Practice</a></section>
      <article class="reader">
        <aside class="margin-note"><p class="label">${escapeHtml(issue.marginNote.label)}</p><p>${inline(issue.marginNote.body)}</p></aside>
        <section class="article-head" id="masterwork"><p class="label">01 / The Canon</p><h2>${escapeHtml(issue.canon.heading)}</h2><p class="standfirst">${inline(issue.canon.standfirst)}</p><div class="reading-meta"><span>Field: ${escapeHtml(issue.canon.field)}</span><span>Target: ${escapeHtml(issue.canon.chapterLabel)}${issue.canon.pageRange ? `, ${escapeHtml(issue.canon.pageRange)}` : ""}</span><span>Source: local copy in Books</span></div>${sourceActions(issue.canon.source)}</section>
        <section class="master-text source-led" aria-label="Canon source packet"><h3>Chapter Reader</h3><p class="source-instruction">${inline(issue.canon.readerIntro)}</p>
          ${readerBlocks(issue.canon.blocks)}
          ${passageAnchors(issue.canon.passageAnchors)}
          ${closeReading(issue.canon.closeReading)}
        </section>
        <section class="drill" id="drill"><p class="label">02 / The Principle</p><h2>${escapeHtml(issue.principle.heading)}</h2><p>${inline(issue.principle.body)}</p><div class="prompt-box"><span>${escapeHtml(issue.principle.exampleLabel)}</span><p>${inline(issue.principle.example)}</p></div><div class="prompt-box"><span>${escapeHtml(issue.principle.practiceLabel)}</span><p>${inline(issue.principle.practice)}</p></div></section>
        ${signalsSection(issue)}
        <section class="output" id="output"><p class="label">05 / The Practice</p><h2>${escapeHtml(issue.output.heading)}</h2><p>${inline(issue.output.body)}</p></section>
      </article>
    </main>
    <script>document.querySelectorAll("[data-copy-command]").forEach((button)=>{const label=button.textContent;button.addEventListener("click",async()=>{const text=button.getAttribute("data-copy-command");try{await navigator.clipboard.writeText(text);button.textContent="Copied command";window.setTimeout(()=>button.textContent=label,1600)}catch{button.textContent="Copy failed";window.setTimeout(()=>button.textContent=label,1600)}})});</script>
    <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
  </body>
</html>
`;
}
