import { execFileSync } from "node:child_process";
import { ensureDir, todayInIST, writeFile, xCandidatesPath } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const bird = process.env.BIRD_READONLY || "/Users/sushil/.local/bin/bird-readonly";

function runBird(args) {
  try {
    const output = execFileSync(bird, args, {
      encoding: "utf8",
      timeout: 120000,
      stdio: ["ignore", "pipe", "pipe"]
    });
    return JSON.parse(output);
  } catch (error) {
    return {
      error: error.message,
      stderr: error.stderr?.toString() || "",
      args
    };
  }
}

function urlFor(tweet) {
  const username = tweet.author?.username || tweet.username || "i";
  return `https://x.com/${username}/status/${tweet.id}`;
}

function normalize(tweet, feed) {
  const text = String(tweet.text || "").trim();
  const likeCount = Number(tweet.likeCount || 0);
  const repostCount = Number(tweet.retweetCount || tweet.repostCount || 0);
  const replyCount = Number(tweet.replyCount || 0);
  const keywordBoost = /\b(marketing|brand|consumer|psychology|story|strategy|distribution|product|startup|design|copy|sales|advertising|media|creator|pricing|positioning)\b/i.test(text) ? 12 : 0;
  const depthBoost = text.length >= 140 ? 8 : text.length >= 80 ? 4 : -8;
  const engagement = Math.log10(1 + likeCount + repostCount * 3 + replyCount * 2) * 10;
  const slopPenalty = /\b(gm|giveaway|airdrop|reply below|like and retweet|what do you think\?|hot take)\b/i.test(text) ? 20 : 0;
  return {
    id: String(tweet.id || ""),
    url: urlFor(tweet),
    text,
    createdAt: tweet.createdAt || "",
    author: tweet.author?.name || "",
    handle: tweet.author?.username || "",
    feed,
    metrics: {
      replies: replyCount,
      reposts: repostCount,
      likes: likeCount
    },
    score: Math.round((keywordBoost + depthBoost + engagement - slopPenalty) * 10) / 10
  };
}

const rawFeeds = [
  ["for_you", ["home", "--json", "-n", "80"]],
  ["following", ["home", "--following", "--json", "-n", "80"]]
];

const raw = {};
const candidatesById = new Map();
for (const [feed, args] of rawFeeds) {
  const result = runBird(args);
  raw[feed] = result;
  if (Array.isArray(result)) {
    for (const tweet of result) {
      if (!tweet?.id || !tweet?.text) continue;
      const candidate = normalize(tweet, feed);
      if (!candidatesById.has(candidate.id) || candidate.score > candidatesById.get(candidate.id).score) {
        candidatesById.set(candidate.id, candidate);
      }
    }
  }
}

const candidates = [...candidatesById.values()]
  .filter((tweet) => tweet.text.length >= 40)
  .sort((a, b) => b.score - a.score)
  .slice(0, 80);

ensureDir("ops/raw");
writeFile(xCandidatesPath(date), `${JSON.stringify({
  date,
  capturedAtIST: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }),
  command: "bird-readonly home --json plus bird-readonly home --following --json",
  readonlyOnly: true,
  minimumSelectionRequired: 1,
  rawCounts: Object.fromEntries(Object.entries(raw).map(([feed, value]) => [feed, Array.isArray(value) ? value.length : 0])),
  candidates
}, null, 2)}\n`);

if (candidates.length < 10) {
  throw new Error(`Only ${candidates.length} X candidates captured; expected at least 10`);
}

console.log(`X_CANDIDATES_CAPTURED ${xCandidatesPath(date)} count=${candidates.length}`);
for (const tweet of candidates.slice(0, 10)) {
  console.log(`${tweet.score} ${tweet.author} (@${tweet.handle}) ${tweet.url}`);
}
