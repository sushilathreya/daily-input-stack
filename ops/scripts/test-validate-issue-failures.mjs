import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATE = "2099-01-15";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "stm-validator-"));
const tempSource = path.join(tempRoot, "source.pdf");

function writeJson(relativePath, value) {
  const fullPath = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildIssue() {
  return {
    date: DATE,
    displayDate: "Thursday, 15 January 2099",
    issueNumber: 999,
    title: "Validator fixture issue",
    eyebrow: "Validator Desk",
    dek: "A compact synthetic issue for deterministic validation checks.",
    meta: {
      canon: "Test Master, The Durable Book",
      study: "30 min",
      practice: "one validation fixture"
    },
    marginNote: {
      label: "Fixture Note",
      body: "This note exists only to satisfy the issue contract."
    },
    canon: {
      author: "Test Master",
      work: "The Durable Book",
      chapter: "The Valid Chapter",
      chapterLabel: "Chapter 1",
      field: "validation",
      heading: "A source-led heading",
      standfirst: "A source-led standfirst.",
      readerIntro: "Read this synthetic source as a complete validator fixture.",
      pageCount: 12,
      allowRepeat: false,
      source: {
        localPath: tempSource,
        driveUrl: "https://drive.google.com/file/d/test/view",
        booksFolderUrl: "https://drive.google.com/drive/folders/test",
        parserPreflight: {
          status: "pdftotext_verified",
          tableOfContentsVerified: true
        }
      },
      blocks: [
        {
          label: "01 / Read the source",
          paragraphs: ["This fixture only exists to exercise validator gates."]
        }
      ],
      closeReading: [
        "What is the central claim?",
        "Where does the chapter prove it?",
        "How would you apply it today?"
      ],
      passageAnchors: [
        "fixture anchor"
      ]
    },
    principle: {
      heading: "A valid issue satisfies every deterministic gate.",
      body: "The validator should reject structural omissions before publication.",
      exampleLabel: "One example",
      example: "A missing field-note body should fail before rendering.",
      practiceLabel: "Deliberate practice - 5 minutes",
      practice: "Remove one required field and confirm the validator fails."
    },
    signals: {
      status: "morning_signals_added",
      fieldNotes: [
        {
          collectedAt: DATE,
          source: "Example Source A",
          sourceDate: DATE,
          title: "First current note",
          whatHappened: "A current source supplied the first fixture note.",
          whyItMatters: "The issue should require a concrete field-note body.",
          watch: "The validator should reject missing note detail.",
          url: "https://example.com/a"
        },
        {
          collectedAt: DATE,
          source: "Example Source B",
          sourceDate: DATE,
          title: "Second current note",
          whatHappened: "A current source supplied the second fixture note.",
          whyItMatters: "Multiple notes keep the morning signal section non-empty.",
          watch: "The validator should reject underfilled notes.",
          url: "https://example.com/b"
        },
        {
          collectedAt: DATE,
          source: "Example Source C",
          sourceDate: DATE,
          title: "Third current note",
          whatHappened: "A current source supplied the third fixture note.",
          whyItMatters: "The issue should have enough external signal support.",
          watch: "The validator should reject stale or incomplete notes.",
          url: "https://example.com/c"
        }
      ],
      tweets: [
        {
          collectedAt: DATE,
          sourceDate: DATE,
          feed: "following",
          author: "Candidate Author",
          title: "Candidate-backed X fragment",
          summary: "A selected fragment present in the captured candidate file.",
          text: "A short selected candidate fixture.",
          url: "https://x.com/example/status/1"
        }
      ]
    },
    output: {
      heading: "Run the deterministic checks.",
      body: "The valid fixture should pass after the failure cases reject bad input."
    }
  };
}

function buildRawCapture() {
  return {
    date: DATE,
    capturedAtIST: `${DATE} 08:30:00`,
    readonlyOnly: true,
    candidates: [
      {
        url: "https://x.com/example/status/1",
        text: "A short selected candidate fixture.",
        author: "Candidate Author"
      }
    ]
  };
}

function writeFixture(issue, history = [], raw = buildRawCapture()) {
  writeJson(`ops/issues/${DATE}.json`, issue);
  writeJson("ops/canon-history.json", history);
  writeJson(`ops/raw/${DATE}-x-candidates.json`, raw);
}

function runValidator() {
  return spawnSync(process.execPath, ["ops/scripts/validate-issue.mjs", DATE], {
    cwd: tempRoot,
    encoding: "utf8"
  });
}

function assertCase(name, mutate, expected) {
  const issue = clone(buildIssue());
  const history = [];
  const raw = buildRawCapture();
  mutate(issue, history, raw);
  writeFixture(issue, history, raw);

  const result = runValidator();
  const output = `${result.stdout}${result.stderr}`;
  const passed = expected.ok
    ? result.status === 0
    : result.status !== 0 && output.includes(expected.error);

  if (!passed) {
    console.error(`FAIL ${name}`);
    console.error(`Expected ${expected.ok ? "success" : `failure containing: ${expected.error}`}`);
    console.error(`Exit status: ${result.status}`);
    console.error(output.trim());
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${name}`);
}

fs.cpSync(path.join(ROOT, "ops/scripts"), path.join(tempRoot, "ops/scripts"), { recursive: true });
fs.mkdirSync(path.dirname(tempSource), { recursive: true });
fs.writeFileSync(tempSource, "fixture source\n");

try {
  assertCase(
    "final validation fails when field notes are missing",
    (issue) => {
      delete issue.signals.fieldNotes;
    },
    { error: "fresh signals require at least 3 field notes" }
  );

  assertCase(
    "final validation fails when tweets are missing",
    (issue) => {
      delete issue.signals.tweets;
    },
    { error: "fresh signals require at least 1 selected X fragment" }
  );

  assertCase(
    "final validation fails when no X fragment is selected",
    (issue) => {
      issue.signals.tweets = [];
    },
    { error: "fresh signals require at least 1 selected X fragment" }
  );

  assertCase(
    "final validation fails when tweet is not from candidates",
    (issue) => {
      issue.signals.tweets[0].url = "https://x.com/example/status/not-captured";
    },
    { error: "was not present in today's captured X candidates" }
  );

  assertCase(
    "final validation fails when field note source date is stale",
    (issue) => {
      issue.signals.fieldNotes[0].sourceDate = "2099-01-01";
    },
    { error: "signals.fieldNotes[0].sourceDate is older than 7 days" }
  );

  assertCase(
    "final validation fails when X capture is stale",
    (_issue, _history, raw) => {
      raw.date = "2099-01-14";
      raw.capturedAtIST = "2099-01-14 08:30:00";
    },
    { error: "X candidate capture date 2099-01-14 does not match issue date" }
  );

  assertCase(
    "final validation fails when canon preflight is unverified",
    (issue) => {
      issue.canon.source.parserPreflight.status = "unchecked";
    },
    { error: "canon.source.parserPreflight.status must be a verified status" }
  );

  assertCase(
    "final validation fails when canon repeats",
    (_issue, history) => {
      history.push({
        date: "2099-01-14",
        author: "Test Master",
        work: "The Durable Book",
        chapter: "The Valid Chapter"
      });
    },
    { error: "Canon repeats 2099-01-14" }
  );

  assertCase("final validation passes for a valid issue", () => {}, { ok: true });
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
