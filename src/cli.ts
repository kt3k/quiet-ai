import { Spinner } from "@std/cli/unstable-spinner";
import { parseArgs } from "@std/cli/parse-args";
import { pipeline } from "./pipeline.ts";
import { type Message, setModel, setVerbose } from "./llm.ts";

const flags = parseArgs(Deno.args, {
  boolean: ["verbose"],
  string: ["model"],
  alias: { verbose: "v", model: "m" },
});

setVerbose(flags.verbose);
if (flags.model) setModel(flags.model);

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

  const spinner = new Spinner({ message: "thinking..." });
  spinner.start();
  try {
    const reply = await pipeline(messages);
    spinner.stop();
    messages.push({ role: "assistant", content: reply });
    write(reply + "\n");
  } catch (e) {
    spinner.stop();
    write(`Error: ${(e as Error).message}\n`);
  }

  write("quiet-ai> ");
}

write("\n");
