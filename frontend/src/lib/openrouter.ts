const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const KEY_STORAGE = 'essensplaner_openrouter_key';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ChatArgs {
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export async function chatCompletion(args: ChatArgs, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: args.model,
    messages: args.messages,
    max_tokens: args.maxTokens ?? 4096,
    temperature: args.temperature ?? 0.3,
  };
  if (args.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter Fehler ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Kein JSON im Modell-Output gefunden');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

// BYOK: Key liegt nur lokal im Browser (localStorage) — nie im Code, nie auf dem Server.
export function getApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE);
}
export function saveApiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key);
}
export function clearApiKey() {
  localStorage.removeItem(KEY_STORAGE);
}
