import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

export function writeFile(relativePath, content) {
  fs.writeFileSync(path.join(ROOT, relativePath), content);
}

export function ensureDir(relativePath) {
  fs.mkdirSync(path.join(ROOT, relativePath), { recursive: true });
}

export function issuePath(date) {
  return `ops/issues/${date}.json`;
}

export function loadIssue(date) {
  return readJson(issuePath(date));
}

export function todayInIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function inline(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<em>", "<em>")
    .replaceAll("</em>", "</em>")
    .replaceAll("<strong>", "<strong>")
    .replaceAll("</strong>", "</strong>")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&lt;em&gt;", "<em>")
    .replaceAll("&lt;/em&gt;", "</em>")
    .replaceAll("&lt;strong&gt;", "<strong>")
    .replaceAll("&lt;/strong&gt;", "</strong>");
}

export function parseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetween(a, b) {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}

export function normalizeText(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isSunday(date) {
  return parseDate(date).getUTCDay() === 0;
}

export function scheduleForDate(date) {
  if (isSunday(date)) {
    return {
      xCaptureCutoffMinutes: 10 * 60 + 45,
      signalCutoffMinutes: 11 * 60 + 20,
      publishStartMinutes: 11 * 60 + 25,
      deliveryDeadlineMinutes: 12 * 60
    };
  }
  return {
    xCaptureCutoffMinutes: 8 * 60 + 45,
    signalCutoffMinutes: 9 * 60 + 20,
    publishStartMinutes: 9 * 60 + 25,
    deliveryDeadlineMinutes: 10 * 60
  };
}

export function istTimestampToMinutes(value) {
  const match = String(value ?? "").match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[2]) * 60 + Number(match[3]);
}

export function nowISTMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

export function xCandidatesPath(date) {
  return `ops/raw/${date}-x-candidates.json`;
}
