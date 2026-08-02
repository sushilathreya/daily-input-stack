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

