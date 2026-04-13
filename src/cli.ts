import { pipeline } from "./pipeline.ts";
import type { Message } from "./llm.ts";

const messages: Message[] = [];
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function write(text: string) {
  Deno.stdout.writeSync(encoder.encode(text));
}

async function readLine(): Promise<string | null> {
  const buf = new Uint8Array(4096);
  const n = await Deno.stdin.read(buf);
  if (n === null) return null;
  return decoder.decode(buf.subarray(0, n)).trim();
}

write("quiet-ai> ");

while (true) {
  const line = await readLine();
  if (line === null || line === "exit") break;
  if (line === "") {
    write("quiet-ai> ");
    continue;
  }

  messages.push({ role: "user", content: line });

  try {
    const reply = await pipeline(messages);
    messages.push({ role: "assistant", content: reply });
    write(reply + "\n");
  } catch (e) {
    write(`Error: ${(e as Error).message}\n`);
  }

  write("quiet-ai> ");
}

write("\n");
