import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DATE_CONFIG } from "./public/config.js";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PUBLIC_DIR = join(ROOT, "public");
const MAX_BODY_BYTES = 16_384;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const rateBuckets = new Map();

const ALLOWED_TIMES = new Set(DATE_CONFIG.times);
const ALLOWED_CANVA = new Set(["I love it", "Sometimes", "Not really"]);
const ALLOWED_LETTERS = new Set([
  "Yes, I do",
  "Maybe with the right person",
  "Not really"
]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ico": "image/x-icon"
};

function loadLocalEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const divider = line.indexOf("=");
    if (divider < 1) continue;
    const key = line.slice(0, divider).trim();
    let value = line.slice(divider + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateResponse(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid response." };
  }

  const { date, time, canva, letters } = payload;
  if (!isRealDate(date)) return { ok: false, error: "Please choose a valid date." };

  const selectedDate = new Date(`${date}T23:59:59`);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (selectedDate < yesterday) return { ok: false, error: "Please choose a future date." };
  if (!ALLOWED_TIMES.has(time)) return { ok: false, error: "Please choose a listed time." };
  if (!ALLOWED_CANVA.has(canva)) return { ok: false, error: "Invalid Canva answer." };
  if (!ALLOWED_LETTERS.has(letters)) return { ok: false, error: "Invalid letter answer." };

  return {
    ok: true,
    value: {
      date,
      time,
      canva,
      letters,
      submittedAt: new Date().toISOString()
    }
  };
}

export function formatTelegramMessage(response) {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${response.date}T12:00:00Z`));

  return [
    "<b>💌 NEW DATE QUEST RESPONSE</b>",
    "",
    `<b>Answer:</b> YES! 🐶💗`,
    `<b>Place:</b> ${escapeHTML(DATE_CONFIG.placeName)} (${escapeHTML(DATE_CONFIG.cafeHandle)})`,
    `<b>Date:</b> ${escapeHTML(dateLabel)}`,
    `<b>Time:</b> ${escapeHTML(response.time)}`,
    "",
    `<b>Likes Canva:</b> ${escapeHTML(response.canva)}`,
    `<b>Likes letters:</b> ${escapeHTML(response.letters)}`,
    "",
    `<i>Sent from A Little Date Quest at ${escapeHTML(response.submittedAt)}</i>`
  ].join("\n");
}

function securityHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "media-src 'self'",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  };
}

function sendJSON(response, status, payload) {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
  response.end(JSON.stringify(payload));
}

function clientKey(request) {
  return String(request.headers["cf-connecting-ip"] || request.socket.remoteAddress || "local");
}

function isRateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  recent.push(now);
  rateBuckets.set(key, recent);
  return recent.length > RATE_LIMIT;
}

async function readJSONBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function notifyTelegram(responseData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.startsWith("replace_") || chatId.startsWith("replace_")) {
    console.log("[date-response] Telegram is not configured:", responseData);
    return { delivered: false, mode: "local" };
  }

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTelegramMessage(responseData),
      parse_mode: "HTML",
      disable_web_page_preview: true
    }),
    signal: AbortSignal.timeout(8_000)
  });

  if (!telegramResponse.ok) {
    const details = await telegramResponse.text();
    console.error(`[telegram] ${telegramResponse.status}: ${details.slice(0, 300)}`);
    throw new Error("TELEGRAM_FAILED");
  }

  return { delivered: true, mode: "telegram" };
}

async function handleSubmission(request, response) {
  if (isRateLimited(request)) {
    sendJSON(response, 429, { ok: false, error: "Please wait a moment and try again." });
    return;
  }

  try {
    const payload = await readJSONBody(request);
    const validation = validateResponse(payload);
    if (!validation.ok) {
      sendJSON(response, 400, { ok: false, error: validation.error });
      return;
    }

    const delivery = await notifyTelegram(validation.value);
    sendJSON(response, 200, { ok: true, delivered: delivery.delivered });
  } catch (error) {
    if (error.message === "BODY_TOO_LARGE") {
      sendJSON(response, 413, { ok: false, error: "Response is too large." });
      return;
    }
    if (error instanceof SyntaxError) {
      sendJSON(response, 400, { ok: false, error: "Invalid JSON." });
      return;
    }
    console.error("[date-response]", error);
    sendJSON(response, 502, { ok: false, error: "Could not deliver the response yet." });
  }
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";

  const safePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = resolve(PUBLIC_DIR, `.${safePath}`);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403, securityHeaders("text/plain; charset=utf-8"));
    response.end("Forbidden");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) filePath = join(filePath, "index.html");
    const contents = await readFile(filePath);
    const contentType = MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
    const cache = /\.(png|jpg|jpeg|webp|mp3|wav|ico)$/i.test(filePath)
      ? "public, max-age=86400"
      : "no-cache";
    response.writeHead(200, { ...securityHeaders(contentType), "Cache-Control": cache });
    response.end(contents);
  } catch {
    response.writeHead(404, securityHeaders("text/plain; charset=utf-8"));
    response.end("Not found");
  }
}

export function createAppServer() {
  return createServer(async (request, response) => {
    if (request.method === "POST" && request.url?.split("?")[0] === "/api/date-response") {
      await handleSubmission(request, response);
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, securityHeaders("text/plain; charset=utf-8"));
      response.end("Method not allowed");
      return;
    }
    await serveStatic(request, response);
  });
}

loadLocalEnv();

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const port = Number(process.env.PORT || 3000);
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`A Little Date Quest is ready at http://localhost:${port}`);
  });
}
