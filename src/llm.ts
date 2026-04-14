const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";
const MODEL = "kimi-k2-turbo-preview";

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

  const payload = {
    model: MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  console.error("[KIMI request]", JSON.stringify(payload, null, 2));

  const res = await fetch(KIMI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[KIMI error response]", res.status, body);
    throw new Error(`Kimi API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  console.error("[KIMI response]", JSON.stringify(data, null, 2));
  return data.choices[0].message.content;
}
