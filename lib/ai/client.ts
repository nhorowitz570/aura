// Tiny OpenRouter wrapper. Server-only.

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-3.5-flash";

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
};

export type OpenRouterTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
};

type CommonOpts = {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
};

function requireKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  return key;
}

function headers(): HeadersInit {
  return {
    "Authorization": `Bearer ${requireKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Aura",
  };
}

/** One-shot JSON response (used by food scan). */
export async function complete(opts: CommonOpts & {
  messages: OpenRouterMessage[];
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: object };
}): Promise<{ content: string }> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.2,
      messages: opts.messages,
      response_format: opts.response_format,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return { content };
}

/** Streaming chat with tool calling support. */
export async function* streamChat(opts: CommonOpts & {
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  tool_choice?: "auto" | "none";
}): AsyncGenerator<
  | { type: "delta"; text: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "done"; finish_reason?: string }
> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      temperature: opts.temperature ?? 0.4,
      stream: true,
      messages: opts.messages,
      tools: opts.tools,
      tool_choice: opts.tools ? (opts.tool_choice ?? "auto") : undefined,
    }),
  });
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${msg}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  // accumulate partial tool calls (deltas come split across chunks)
  const pendingToolCalls = new Map<number, { id?: string; name?: string; args?: string }>();
  let finish: string | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let evt: { choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string }[] };
        try { evt = JSON.parse(payload); } catch { continue; }
        const choice = evt?.choices?.[0];
        if (!choice) continue;
        if (choice.delta?.content) yield { type: "delta", text: choice.delta.content };
        for (const tc of choice.delta?.tool_calls ?? []) {
          const entry = pendingToolCalls.get(tc.index) ?? {};
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.args = (entry.args ?? "") + tc.function.arguments;
          pendingToolCalls.set(tc.index, entry);
        }
        if (choice.finish_reason) finish = choice.finish_reason;
      }
    }
  }

  for (const tc of pendingToolCalls.values()) {
    if (tc.id && tc.name) yield { type: "tool_call", id: tc.id, name: tc.name, arguments: tc.args ?? "{}" };
  }
  yield { type: "done", finish_reason: finish };
}
