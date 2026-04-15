# quiet-ai — Specification

## Overview

quiet-ai is a chatbot that answers user questions with extremely short, terse
responses — typically 1–3 brief sentences. The bot deliberately prioritizes
brevity over thoroughness. However, when the user clearly demands a detailed or
long-form answer, the bot switches to "verbose mode" and responds at length.

## Behavior

### Default Mode (Quiet Mode)

- Respond with 1–3 short sentences.
- The number of sentences scales with the complexity of the answer, but always
  stays minimal.
- When even a short sentence is unnecessary, respond with just an emoji (e.g.,
  "👍", "🤷") or a bare interjection (e.g., "oh", "hmm", "nah", "yep").
- Responses should be factually grounded but stripped of unnecessary context and
  explanation.
- Ambiguity is acceptable when brevity demands it.

### Verbose Mode

- Triggered when the user's input clearly requests a long or detailed answer
  (e.g., "explain in detail", "give me a full guide", "write me an essay on…").
- In this mode, the bot responds with a thorough, multi-paragraph answer.
- The bot returns to quiet mode on the next message unless the user again
  requests detail.

### Examples

| User input                               | Mode    | Response                                                     |
| ---------------------------------------- | ------- | ------------------------------------------------------------ |
| "Thanks!"                                | Quiet   | "👍"                                                         |
| "Really?"                                | Quiet   | "yep"                                                        |
| "What is the capital of France?"         | Quiet   | "Paris."                                                     |
| "How do I fix a segfault?"               | Quiet   | "Check your pointers. Run with AddressSanitizer."            |
| "Should I use React or Vue?"             | Quiet   | "Depends on your team. React has more jobs. Vue is simpler." |
| "Explain quantum entanglement in detail" | Verbose | (Multi-paragraph explanation)                                |
| "What's the best programming language?"  | Quiet   | "Depends on what you're building."                           |

## Technical Stack

- **Runtime:** Deno
- **AI Provider:** OpenRouter (multi-vendor gateway; default model
  `moonshotai/kimi-k2`, overridable)
- **API:** OpenRouter OpenAI-compatible chat completions endpoint
  (`https://openrouter.ai/api/v1/chat/completions`)
- **Web Framework:** Hono (for the web UI backend)
- **Deployment:** Deno Deploy

## Response Pipeline

Instead of relying on a single prompt to produce short answers, quiet-ai uses a
multi-stage pipeline of independent LLM calls. Each stage operates in its own
isolated context to ensure unbiased judgment.

### Stage 1: Raw Answer

- Send the user's question to the LLM with a neutral system prompt (no brevity
  instructions).
- The model answers normally and fully, producing a complete response.
- If verbose mode is active, return this raw answer directly to the user and
  skip remaining stages.

### Stage 2: Information Volume Classification (Sub-agent)

- A separate LLM call receives **only the raw answer text** — no conversation
  history, no user question.
- System prompt: "Classify the information volume of the following text. How
  much information is essential to convey the core meaning? Respond with exactly
  one of: XS, S, M, L."
- Output: one of `XS`, `S`, `M`, `L`.

| Classification | Meaning                                               | Target format                             |
| -------------- | ----------------------------------------------------- | ----------------------------------------- |
| XS             | Minimal — a reaction, acknowledgment, or trivial fact | Emoji or interjection (e.g., "👍", "yep") |
| S              | A single key point                                    | 1 sentence                                |
| M              | Two related points                                    | 2 sentences                               |
| L              | Multiple points needed for coherence                  | 3 sentences                               |

### Stage 3: Compression (Main agent)

- Send the raw answer back to the main LLM with a system prompt instructing it
  to compress the answer into the target format determined by Stage 2.
- For XS: "Reduce this to a single emoji or interjection."
- For S: "Compress this into exactly 1 short sentence."
- For M: "Compress this into exactly 2 short sentences."
- For L: "Compress this into exactly 3 short sentences."

### Stage 4: Final Shortening (Sub-agent)

- A separate LLM call receives **only the compressed text** — no conversation
  history, no original question.
- System prompt: "Make this shorter. Remove filler words, shorten phrases, use
  abbreviations where natural. Keep the same number of sentences (or
  emoji/interjection). Do not add information."
- Output: the final response delivered to the user.

### Pipeline Diagram

```
User Question
     │
     ▼
┌──────────────────┐
│  Stage 1: Raw    │  Full LLM answer (with conversation context)
│  Answer          │
└────────┬─────────┘
         │
         ├─── [Verbose mode?] ──→ Return raw answer directly
         │
         ▼
┌──────────────────┐
│  Stage 2: Classify│  Sub-agent (isolated context)
│  Volume (XS/S/M/L)│  Input: raw answer only
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Stage 3: Compress│  Main agent
│  to target format │  Input: raw answer + target format
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Stage 4: Shorten │  Sub-agent (isolated context)
│  further          │  Input: compressed text only
└────────┬─────────┘
         │
         ▼
    Final Response
```

## Interfaces

### CLI REPL

- Interactive REPL via terminal.
- The user types a question, presses Enter, and receives a terse reply.
- Conversation history is maintained within the session for context.
- Type `exit` or press Ctrl+C to quit.
- Run with: `deno task cli`
- Flags:
  - `--model <id>` / `-m <id>`: override the OpenRouter model for this session
    (e.g. `deno task cli -- -m openai/gpt-4o-mini`).
  - `--verbose` / `-v`: dump raw OpenRouter request/response payloads to stderr.

### Web UI

- A single-page chat interface served over HTTP.
- Minimal, clean design — reflects the terse personality of the bot.
- Messages displayed in a chat bubble layout.
- Input field at the bottom, send on Enter.
- Conversation history maintained per browser session (in-memory on the server
  or client-side).
- Served at `http://localhost:8000` in development.
- Run with: `deno task serve`

## Deployment

**Platform: Deno Deploy**

Deno Deploy is chosen because:

- Native Deno support — no build step, no adapter, no Docker.
- Edge deployment with low latency globally.
- Free tier is sufficient for a lightweight chatbot.
- Seamless integration with Hono.
- Simple deployment via `deployctl` or GitHub integration.

The web UI is the primary deployed artifact. The CLI REPL is for local use only.

## Configuration

- The OpenRouter API key is read from the `OPENROUTER_API_KEY` environment
  variable.
- The model is configurable via the `OPENROUTER_MODEL` environment variable
  (defaults to `moonshotai/kimi-k2`). Any OpenRouter-supported model id is
  accepted (e.g. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4.5`,
  `google/gemini-2.5-flash`).
- The CLI also accepts `--model <id>` / `-m <id>`, which takes precedence over
  the env var for that run.

## Non-Goals

- No persistent storage or database.
- No user authentication.
- No streaming output (responses are returned as a whole).
