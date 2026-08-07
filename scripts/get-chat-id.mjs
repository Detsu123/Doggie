import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env");
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const divider = line.indexOf("=");
    if (divider < 1) continue;
    const key = line.slice(0, divider).trim();
    let value = line.slice(divider + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || token.startsWith("replace_")) {
  console.error("Add TELEGRAM_BOT_TOKEN to .env first. Never paste the token into public code.");
  process.exit(1);
}

try {
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    signal: AbortSignal.timeout(8_000)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || `HTTP ${response.status}`);

  const chats = new Map();
  for (const update of data.result) {
    const chat = update.message?.chat || update.edited_message?.chat || update.channel_post?.chat;
    if (chat) chats.set(String(chat.id), chat);
  }

  if (!chats.size) {
    console.log("No chat found yet. Send your bot one message in Telegram, then run this command again.");
    process.exit(0);
  }

  console.log("Available Telegram chat IDs:");
  for (const [id, chat] of chats) {
    const label = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "Unnamed chat";
    console.log(`- ${label}: ${id}`);
  }
} catch (error) {
  console.error(`Could not read Telegram updates: ${error.message}`);
  process.exit(1);
}
