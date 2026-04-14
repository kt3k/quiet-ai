import { chat, type Message } from "./llm.ts";

type Volume = "XS" | "S" | "M" | "L";

/** Detect if the user explicitly requests a detailed/long answer. */
function isVerboseRequest(userMessage: string): boolean {
  const patterns = [
    /\bexplain\b.*\b(in\s+)?detail/i,
    /\bfull\s+guide\b/i,
    /\bwrite\b.*\b(essay|article|report)\b/i,
    /\btell\s+me\s+everything\b/i,
    /\bstep\s*by\s*step\b/i,
    /\bthoroughly\b/i,
    /\bin\s+depth\b/i,
    /\bcomprehensive/i,
    /\bdetailed\b/i,
    /\belaborate\b/i,
  ];
  return patterns.some((p) => p.test(userMessage));
}

/** Stage 1: Generate a full, normal answer. */
async function rawAnswer(messages: Message[]): Promise<string> {
  return await chat(
    "You are a helpful assistant. Answer the user's question fully and accurately.",
    messages,
  );
}

/** Stage 2: Classify information volume (isolated context). */
async function classifyVolume(text: string): Promise<Volume> {
  const result = await chat(
    "Classify the information volume of the following text. How much information is essential to convey the core meaning? Respond with exactly one of: XS, S, M, L.",
    [{ role: "user", content: text }],
  );
  const trimmed = result.trim().toUpperCase();
  if (
    trimmed === "XS" || trimmed === "S" || trimmed === "M" || trimmed === "L"
  ) {
    return trimmed;
  }
  return "S";
}

/** Stage 3: Compress the raw answer to the target format. */
async function compress(text: string, volume: Volume): Promise<string> {
  const instructions: Record<Volume, string> = {
    XS:
      "Reduce the following text to a single emoji or interjection (e.g. '👍', 'yep', 'nah'). Output only the emoji or interjection, nothing else.",
    S: "Compress the following text into exactly 1 short sentence. Output only that sentence.",
    M: "Compress the following text into exactly 2 short sentences. Output only those sentences.",
    L: "Compress the following text into exactly 3 short sentences. Output only those sentences.",
  };
  return await chat(instructions[volume], [{ role: "user", content: text }]);
}

/** Stage 4: Final shortening (isolated context). */
async function shorten(text: string): Promise<string> {
  return await chat(
    "Make these sentences extremely shorter. It is ok to loose the meaning of the sentences. Output only the shortened text.",
    [{ role: "user", content: text }],
  );
}

/** Run the full pipeline. Returns the final response to show the user. */
export async function pipeline(messages: Message[]): Promise<string> {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && isVerboseRequest(lastMessage.content)) {
    return await rawAnswer(messages);
  }

  const raw = await rawAnswer(messages);
  const volume = await classifyVolume(raw);
  const compressed = await compress(raw, volume);
  const final = await shorten(compressed);
  return final;
}
