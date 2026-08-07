import test from "node:test";
import assert from "node:assert/strict";
import {
  createAppServer,
  escapeHTML,
  formatTelegramMessage,
  validateResponse
} from "../server.mjs";

const validPayload = {
  date: "2099-08-18",
  time: "3:30 PM",
  canva: "I love it",
  letters: "Maybe with the right person"
};

test("accepts a complete future date response", () => {
  const result = validateResponse(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.value.time, "3:30 PM");
});

test("rejects options that were not shown in the UI", () => {
  const result = validateResponse({ ...validPayload, time: "25:99" });
  assert.equal(result.ok, false);
});

test("escapes Telegram HTML", () => {
  assert.equal(escapeHTML("<b>A&B</b>"), "&lt;b&gt;A&amp;B&lt;/b&gt;");
});

test("formats the chosen café and date", () => {
  const result = validateResponse(validPayload);
  const message = formatTelegramMessage(result.value);
  assert.match(message, /@moria_cafemn/);
  assert.match(message, /August 18, 2099/);
  assert.match(message, /Maybe with the right person/);
});

test("serves the game and accepts its API payload", async (context) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const page = await fetch(`${baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /A little question/);

  const submission = await fetch(`${baseUrl}/api/date-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validPayload)
  });
  assert.equal(submission.status, 200);
  assert.equal((await submission.json()).ok, true);
});
