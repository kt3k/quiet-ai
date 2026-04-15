const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "moonshotai/kimi-k2";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

let verbose = false;

export function setVerbose(v: boolean) {
  verbose = v;
}

export async function chat(
  systemPrompt: string,
  messages: Message[],
): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const model = Deno.env.get("OPENROUTER_MODEL") ?? DEFAULT_MODEL;

  const payload = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  if (verbose) {
    console.error("[OpenRouter request]", JSON.stringify(payload, null, 2));
  }

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    if (verbose) {
      console.error("[OpenRouter error response]", res.status, body);
    }
    throw new Error(`OpenRouter API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (verbose) {
    console.error("[OpenRouter response]", JSON.stringify(data, null, 2));
  }
  return data.choices[0].message.content;
}
