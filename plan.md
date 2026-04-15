# Task Breakdown: quiet-ai Implementation

## Specifications

- 4-stage response pipeline: raw answer → volume classification (XS/S/M/L) →
  compression → final shortening
- Sub-agents (Stage 2, 4) operate in isolated context — no conversation history
  leaked
- Verbose mode bypasses pipeline, returns raw answer directly
- OpenRouter OpenAI-compatible API, key from `OPENROUTER_API_KEY` env var, model
  from `OPENROUTER_MODEL` (default `moonshotai/kimi-k2`)
- CLI REPL with session-scoped conversation history
- Web UI: single-page chat with Hono backend, chat bubble layout
- Deploy to Deno Deploy (web UI only; CLI is local-only)
- No streaming, no persistence, no auth

## Subtasks

-
  1. [ ] Project scaffolding [M]
  - [ ] 1.1 Initialize Deno project config and dependencies [S]
  - [ ] 1.2 Set up project directory structure [XS]
-
  2. [ ] LLM client layer [S]
  - [ ] 2.1 Implement Kimi K2.5 chat completions client [S]
-
  3. [ ] Response pipeline core [L]
  - [ ] 3.1 Stage 1: Raw answer generation [S]
  - [ ] 3.2 Stage 2: Volume classification sub-agent [M]
  - [ ] 3.3 Stage 3: Compression to target format [M]
  - [ ] 3.4 Stage 4: Final shortening sub-agent [S]
  - [ ] 3.5 Verbose mode detection and bypass [S]
  - [ ] 3.6 Pipeline orchestrator [M]
-
  4. [ ] CLI REPL interface [M]
  - [ ] 4.1 REPL loop with conversation history [S]
  - [ ] 4.2 Exit handling and UX polish [XS]
-
  5. [ ] Web UI [L]
  - [ ] 5.1 Hono API route for chat endpoint [S]
  - [ ] 5.2 HTML/CSS chat page [M]
  - [ ] 5.3 Client-side JS for chat interaction [M]
-
  6. [ ] Deployment [M]
  - [ ] 6.1 Deno Deploy configuration [S]
  - [ ] 6.2 Verify deployed app works end-to-end [S]

## Subtask Details

### 1. Project scaffolding

Set up the Deno project foundation so all subsequent work has a place to land.

#### 1.1 Initialize Deno project config and dependencies

Create `deno.json` with tasks (`cli`, `serve`, `fmt`, `lint`), import map
entries for Hono, and any config needed. No lock file needed for Deno Deploy.

#### 1.2 Set up project directory structure

Create the directory layout: `src/` for core logic, `src/web/` for the web UI
static assets, entry points (`cli.ts`, `serve.ts`).

### 2. LLM client layer

A thin wrapper around the Kimi K2.5 OpenAI-compatible API.

#### 2.1 Implement Kimi K2.5 chat completions client

A function that takes a system prompt + messages array and returns the
assistant's response string. Uses `fetch` against the Kimi API endpoint. Reads
`KIMI_API_KEY` from env. This single function is reused by all 4 pipeline
stages.

### 3. Response pipeline core

The heart of the application — the 4-stage pipeline that transforms a full
answer into a terse one.

#### 3.1 Stage 1: Raw answer generation

Call the LLM with the user's conversation history and a neutral system prompt.
Return the full response text.

#### 3.2 Stage 2: Volume classification sub-agent

A separate LLM call that receives **only** the raw answer text. System prompt
instructs it to classify as XS/S/M/L. Parse the response and return the
classification enum. Handle edge cases (unexpected output → default to S).

#### 3.3 Stage 3: Compression to target format

Based on the classification, call the LLM with the raw answer and a
format-specific system prompt (emoji/1-sentence/2-sentence/3-sentence). Return
compressed text.

#### 3.4 Stage 4: Final shortening sub-agent

A separate LLM call receiving **only** the compressed text. System prompt
instructs further shortening without adding info. Return final text.

#### 3.5 Verbose mode detection and bypass

Before entering the pipeline, check if the user's message explicitly requests
detail. This can be a simple LLM call or keyword heuristic. If verbose, Stage
1's raw answer is returned directly.

#### 3.6 Pipeline orchestrator

A single `pipeline(messages): Promise<string>` function that chains Stages
1→2→3→4 (or short-circuits for verbose mode). This is the sole entry point
consumed by both CLI and Web interfaces.

### 4. CLI REPL interface

Terminal-based interactive interface.

#### 4.1 REPL loop with conversation history

Read lines from stdin, maintain a messages array, call the pipeline, print the
response. Append both user and assistant messages to history for Stage 1
context.

#### 4.2 Exit handling and UX polish

Handle `exit` command, Ctrl+C (SIGINT), prompt formatting (`>` prefix), and
empty input.

### 5. Web UI

Browser-based chat interface served by Hono.

#### 5.1 Hono API route for chat endpoint

`POST /api/chat` accepts `{ messages: [...] }`, runs the pipeline, returns
`{ reply: "..." }`. Conversation history is managed client-side and sent with
each request.

#### 5.2 HTML/CSS chat page

Single `index.html` with minimal, clean design. Chat bubble layout, auto-scroll,
input field fixed at bottom. Inline CSS — no build tools.

#### 5.3 Client-side JS for chat interaction

Fetch to `/api/chat` on submit, render bubbles, maintain message history in JS
array, handle loading state.

### 6. Deployment

#### 6.1 Deno Deploy configuration

Ensure `serve.ts` uses `Deno.serve()` (Deno Deploy compatible). Add `deployctl`
config or GitHub integration setup instructions.

#### 6.2 Verify deployed app works end-to-end

Test the deployed URL with sample questions across all volume classifications
(XS through L) and verbose mode.
