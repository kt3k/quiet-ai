const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";
const MODEL = "kimi-k2.5";

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chat(
  systemPrompt: string,
  messages: Message[],
): Promise<string> {
  const apiKey = Deno.env.get("KIMI_API_KEY");
  if (!apiKey) {
    throw new Error("KIMI_API_KEY environment variable is not set");
  }

  const res = await fetch(KIMI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kimi API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
