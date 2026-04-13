import { Hono } from "hono";
import { pipeline } from "./pipeline.ts";
import type { Message } from "./llm.ts";

const app = new Hono();

app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{ messages: Message[] }>();
  try {
    const reply = await pipeline(messages);
    return c.json({ reply });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get("/", (c) => {
  return c.html(html);
});

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>quiet-ai</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}
header {
  padding: 12px 16px;
  border-bottom: 1px solid #222;
  font-size: 14px;
  color: #888;
}
#chat {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.msg {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.4;
  word-wrap: break-word;
}
.msg.user {
  align-self: flex-end;
  background: #2a2a2a;
  color: #fff;
}
.msg.assistant {
  align-self: flex-start;
  background: #1a1a1a;
  border: 1px solid #333;
}
.msg.loading {
  color: #666;
  font-style: italic;
}
form {
  display: flex;
  padding: 12px;
  gap: 8px;
  border-top: 1px solid #222;
}
input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 15px;
  outline: none;
}
input:focus { border-color: #555; }
button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #333;
  color: #e0e0e0;
  font-size: 15px;
  cursor: pointer;
}
button:hover { background: #444; }
button:disabled { opacity: 0.4; cursor: default; }
</style>
</head>
<body>
<header>quiet-ai</header>
<div id="chat"></div>
<form id="form">
  <input id="input" type="text" placeholder="Ask something..." autocomplete="off" autofocus>
  <button type="submit">Send</button>
</form>
<script>
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = [];

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  messages.push({ role: "user", content: text });
  addBubble("user", text);

  const loader = addBubble("assistant loading", "...");
  input.disabled = true;
  form.querySelector("button").disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    messages.push({ role: "assistant", content: data.reply });
    loader.textContent = data.reply;
    loader.className = "msg assistant";
  } catch (err) {
    loader.textContent = "Error: " + err.message;
    loader.className = "msg assistant";
  } finally {
    input.disabled = false;
    form.querySelector("button").disabled = false;
    input.focus();
  }
});
</script>
</body>
</html>`;

Deno.serve({ port: 8000 }, app.fetch);
