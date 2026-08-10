import { readJson, todayInIST } from "./lib.mjs";

const date = process.argv[2] || todayInIST();
const kind = process.argv[3] || "newsletter";
const readyPath = `ops/state/${date}-publish-ready.json`;
const apiKey = process.env.RESEND_API_KEY || "";
const from = process.env.STM_EMAIL_FROM || "";
const fallbackTo = process.env.STM_EMAIL_TO || "stickmansubscriptions@gmail.com";

if (!apiKey) throw new Error("Missing RESEND_API_KEY");
if (!from) throw new Error("Missing STM_EMAIL_FROM");

function htmlFromText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br>");
}

function alertPayload(reason) {
  const subject = `Studying the Masters delivery alert - ${date}`;
  const text = [
    `Studying the Masters did not send normally for ${date}.`,
    "",
    `Reason: ${reason}`,
    "",
    "The VPS runner is alive, but the newsletter needs attention."
  ].join("\n");
  return {
    from,
    to: [fallbackTo],
    subject,
    text,
    html: `<p>${htmlFromText(text)}</p>`
  };
}

function newsletterPayload() {
  const ready = readJson(readyPath);
  const to = process.env.STM_EMAIL_TO || ready.email_recipient || fallbackTo;
  return {
    from,
    to: [to],
    subject: ready.email_subject,
    text: ready.email_body,
    html: `<p>${htmlFromText(ready.email_body)}</p>`
  };
}

const payload = kind === "alert"
  ? alertPayload(process.argv.slice(4).join(" ") || "Unknown delivery failure")
  : newsletterPayload();

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const body = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`Resend failed ${response.status}: ${JSON.stringify(body)}`);
}

console.log(body.id || "");
