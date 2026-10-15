// Shared OpenAI chat-completions call that works across model generations.
// Reasoning models (o-series, gpt-5, gpt-6 ...) take `reasoning_effort` and reject `temperature`;
// older chat models are the other way round. If OpenAI still rejects one of those settings, retry once without it.

const REASONING = /^(o\d|gpt-(5|6|7|8|9))/i;

export function isReasoningModel(model: string): boolean {
  return REASONING.test(model);
}

type ChatBody = Record<string, unknown> & { model: string };

export async function openaiChat(key: string, body: ChatBody, opts: { effort: string; timeoutMs: number }): Promise<{
  choices?: { message?: { content?: string; tool_calls?: { function?: { arguments?: string } }[] } }[];
}> {
  const url = `${process.env.OPENAI_BASE_URL || "https://api.openai.com"}/v1/chat/completions`;
  const base: ChatBody = { ...body, ...(isReasoningModel(body.model) ? { reasoning_effort: opts.effort } : { temperature: 0.7 }) };
  let payload = base;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    if (res.ok) return res.json();
    const text = (await res.text().catch(() => "")).slice(0, 400);
    console.error("openai error", body.model, res.status, text);
    const tunable = res.status === 400 && /reasoning_effort|temperature/i.test(text);
    if (tunable && attempt === 0) {
      const rest = { ...payload };
      delete rest.reasoning_effort;
      delete rest.temperature;
      payload = rest as ChatBody;
      continue;
    }
    throw new Error(`openai_${res.status}`);
  }
  throw new Error("openai_failed");
}
